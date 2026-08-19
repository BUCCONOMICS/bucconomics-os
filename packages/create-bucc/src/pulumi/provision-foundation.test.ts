import { describe, expect, it } from "@jest/globals";
import type { PulumiCommand } from "@pulumi/pulumi/automation/index.js";

import { createMigrationDriver } from "./migration-driver.js";
import { createFoundationProvisioner } from "./provision-foundation.js";
import type { ProcessRunInput } from "./process-runner.js";

const command = { command: "/safe/pulumi" } as unknown as PulumiCommand;
const config = {
  name: "harbour",
  region: "eu-west-2",
  expectedAccountId: "123456789012",
  vpcCidr: "10.20.0.0/16",
  mode: "practice",
  dbAllocatedStorageGiB: 20,
  dbBackupRetentionDays: 7,
  dbInstanceClass: "db.t4g.medium",
  lambdaMemorySize: 512,
  lambdaTimeoutSeconds: 900,
} as const;

describe("foundation provisioner", () => {
  it("migrates local encrypted state, rotates passphrase, applies S3 stack, and cleans up", async () => {
    const calls: string[] = [];
    let cleaned = false;
    const provisioner = createFoundationProvisioner({
      automation: {
        async upBootstrap(input) {
          calls.push(`bootstrap:${input.workDir}`);
          return {
            backendRef: "s3://operator-state",
            passphraseSecretRef: "arn:aws:secretsmanager:passphrase",
          };
        },
        async upFoundation(input) {
          calls.push(`foundation:${input.backendUrl}`);
          return {
            backendRef: "s3://operator-state",
            passphraseSecretRef: "arn:aws:secretsmanager:passphrase",
            databaseRef: "database.internal:5432",
            reportsStorageRef: "arn:reports",
            exportsStorageRef: "arn:exports",
          };
        },
      },
      migration: {
        async migrate(input) {
          calls.push(`migrate:${input.sourceBackendUrl}`);
        },
        async rotatePassphrase() {
          calls.push("rotate");
        },
      },
      secretReader: {
        async readPassphrase() {
          calls.push("read-secret");
          return "permanent-passphrase";
        },
      },
      workspaces: {
        async create() {
          return {
            path: "/tmp/create-bucc-test",
            localStatePath: "/tmp/create-bucc-test/state",
            async cleanup() {
              cleaned = true;
              calls.push("cleanup");
            },
          };
        },
      },
    });

    const result = await provisioner.provision({ config, command });

    expect(result.status).toBe("foundation-only");
    expect(calls).toEqual([
      "bootstrap:/tmp/create-bucc-test",
      "read-secret",
      "migrate:file:///tmp/create-bucc-test/state",
      "rotate",
      "foundation:s3://operator-state",
      "cleanup",
    ]);
    expect(cleaned).toBe(true);
  });

  it("retains encrypted recovery state after migration begins", async () => {
    let cleaned = false;
    const provisioner = createFoundationProvisioner({
      automation: {
        upBootstrap: async () => ({
          backendRef: "s3://operator-state",
          passphraseSecretRef: "arn:aws:secretsmanager:passphrase",
        }),
        upFoundation: async () => ({}),
      },
      migration: {
        migrate: async () => {
          throw new Error("raw secret-bearing process error");
        },
        rotatePassphrase: async () => {},
      },
      secretReader: { readPassphrase: async () => "permanent" },
      workspaces: {
        async create() {
          return {
            path: "/tmp/recovery-safe-path",
            localStatePath: "/tmp/recovery-safe-path/state",
            cleanup: async () => {
              cleaned = true;
            },
          };
        },
      },
    });

    await expect(provisioner.provision({ config, command })).rejects.toThrow(
      "/tmp/recovery-safe-path",
    );
    expect(cleaned).toBe(false);
  });

  it("retains encrypted recovery state when the bootstrap outcome is uncertain", async () => {
    let cleaned = false;
    const provisioner = createFoundationProvisioner({
      automation: {
        upBootstrap: async (input) => {
          input.onUpdateStart();
          throw new Error("update failed after creating resources");
        },
        upFoundation: async () => ({}),
      },
      migration: {
        migrate: async () => {},
        rotatePassphrase: async () => {},
      },
      secretReader: { readPassphrase: async () => "permanent" },
      workspaces: {
        async create() {
          return {
            path: "/tmp/bootstrap-recovery",
            localStatePath: "/tmp/bootstrap-recovery/state",
            cleanup: async () => {
              cleaned = true;
            },
          };
        },
      },
    });

    await expect(provisioner.provision({ config, command })).rejects.toThrow(
      "/tmp/bootstrap-recovery",
    );
    expect(cleaned).toBe(false);
  });

  it("cleans up when bootstrap setup fails before an update starts", async () => {
    let cleaned = false;
    const provisioner = createFoundationProvisioner({
      automation: {
        upBootstrap: async () => {
          throw new Error("workspace setup failed");
        },
        upFoundation: async () => ({}),
      },
      migration: {
        migrate: async () => {},
        rotatePassphrase: async () => {},
      },
      secretReader: { readPassphrase: async () => "permanent" },
      workspaces: {
        async create() {
          return {
            path: "/tmp/setup-failure",
            localStatePath: "/tmp/setup-failure/state",
            cleanup: async () => {
              cleaned = true;
            },
          };
        },
      },
    });

    await expect(provisioner.provision({ config, command })).rejects.toThrow(
      "before update",
    );
    expect(cleaned).toBe(true);
  });

  it("retains state when the backend passphrase cannot be read", async () => {
    let cleaned = false;
    const provisioner = createFoundationProvisioner({
      automation: {
        upBootstrap: async () => ({
          backendRef: "s3://operator-state",
          passphraseSecretRef: "arn:aws:secretsmanager:passphrase",
        }),
        upFoundation: async () => ({}),
      },
      migration: {
        migrate: async () => {},
        rotatePassphrase: async () => {},
      },
      secretReader: {
        readPassphrase: async () => {
          throw new Error("secret unavailable");
        },
      },
      workspaces: {
        async create() {
          return {
            path: "/tmp/passphrase-recovery",
            localStatePath: "/tmp/passphrase-recovery/state",
            cleanup: async () => {
              cleaned = true;
            },
          };
        },
      },
    });

    await expect(provisioner.provision({ config, command })).rejects.toThrow(
      "/tmp/passphrase-recovery",
    );
    expect(cleaned).toBe(false);
  });
});

describe("Pulumi migration driver", () => {
  it("keeps passphrases out of arguments and sends the permanent value over stdin", async () => {
    const calls: ProcessRunInput[] = [];
    const driver = createMigrationDriver({
      async run(input) {
        calls.push(input);
      },
    });

    await driver.migrate({
      command: "/safe/pulumi",
      cwd: "/tmp/work",
      stackName: "harbour-foundation",
      sourceBackendUrl: "file:///tmp/state",
      targetBackendUrl: "s3://state",
      temporaryPassphrase: "temporary-secret",
    });
    await driver.rotatePassphrase({
      command: "/safe/pulumi",
      cwd: "/tmp/work",
      stackName: "harbour-foundation",
      targetBackendUrl: "s3://state",
      temporaryPassphrase: "temporary-secret",
      permanentPassphrase: "permanent-secret",
    });

    expect(calls).toHaveLength(2);
    for (const call of calls) {
      expect(call.args).not.toContain("temporary-secret");
      expect(call.args).not.toContain("permanent-secret");
      expect(call.env.PULUMI_CONFIG_PASSPHRASE).toBe("temporary-secret");
    }
    expect(calls[1]?.stdin).toBe("permanent-secret\npermanent-secret\n");
  });
});
