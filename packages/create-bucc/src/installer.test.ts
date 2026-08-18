import { describe, expect, it } from "@jest/globals";
import type { PulumiCommand } from "@pulumi/pulumi/automation/index.js";

import { assembleConfigs, normalizeName } from "./config.js";
import { runInstaller } from "./orchestrator.js";
import type { Presenter, PromptPort, ProviderSecretStore } from "./types.js";
import { runWizard } from "./wizard.js";

const command = { command: "/safe/pulumi" } as unknown as PulumiCommand;

describe("wizard", () => {
  it("collects one screen at a time and masks provider credentials", async () => {
    const prompt = queuePrompt({
      inputs: [
        "Harbour BUCC",
        "eu-west-2",
        "ops@example.com",
        "real-kyc",
        "real-fiat",
        "rpc-provider",
        "24",
        "250",
      ],
      selects: ["live", "credentials", "credentials", "credentials"],
      passwords: ["kyc-secret", "fiat-secret", "rpc-secret"],
    });

    const answers = await runWizard(prompt.port);

    expect(answers.mode).toBe("live");
    expect(answers.kycProvider).toEqual({
      provider: "real-kyc",
      mode: "credentials",
      credential: "kyc-secret",
    });
    expect(prompt.passwordRequests).toHaveLength(3);
    expect(prompt.passwordRequests.every(({ mask }) => mask === "*")).toBe(
      true,
    );
  });

  it("defaults to practice, sandbox providers, and Base Sepolia", async () => {
    const prompt = queuePrompt({
      inputs: [
        "Harbour",
        "eu-west-2",
        "ops@example.com",
        "mock-kyc",
        "mock-fiat",
        "https://sepolia.base.org",
        "168",
        "100",
      ],
      selects: ["practice", "sandbox", "sandbox", "public"],
      passwords: [],
    });

    const answers = await runWizard(prompt.port);

    expect(answers.mode).toBe("practice");
    expect(answers.rpc).toEqual({
      mode: "public",
      endpoint: "https://sepolia.base.org",
    });
    expect(prompt.passwordRequests).toHaveLength(0);
  });

  it("rejects non-positive review and budget values", async () => {
    const prompt = queuePrompt({
      inputs: [
        "Harbour",
        "eu-west-2",
        "ops@example.com",
        "mock-kyc",
        "mock-fiat",
        "https://sepolia.base.org",
        "0",
        "100",
      ],
      selects: ["practice", "sandbox", "sandbox", "public"],
      passwords: [],
    });
    await expect(runWizard(prompt.port)).rejects.toThrow("review cadence");
  });
});

describe("config assembly", () => {
  it("writes credentials and retains only returned secret ARNs", async () => {
    const rawSecrets = ["kyc-raw", "fiat-raw", "rpc-raw"];
    const writes: string[] = [];
    const secrets: ProviderSecretStore = {
      async writeSecret(input) {
        writes.push(input.value);
        return `arn:aws:secretsmanager:eu-west-2:123456789012:secret:${input.kind}`;
      },
      deleteSecret: async () => {},
    };

    const config = await assembleConfigs({
      identity: {
        accountId: "123456789012",
        arn: "arn:aws:sts::123456789012:assumed-role/operator/session",
      },
      secrets,
      answers: {
        name: "Harbour BUCC",
        region: "eu-west-2",
        contactEmail: "ops@example.com",
        mode: "live",
        kycProvider: {
          provider: "kyc",
          mode: "credentials",
          credential: rawSecrets[0]!,
        },
        financialProvider: {
          provider: "fiat",
          mode: "credentials",
          credential: rawSecrets[1]!,
        },
        rpc: {
          provider: "rpc",
          mode: "credentials",
          credential: rawSecrets[2]!,
        },
        reviewCadenceHours: 168,
        budgetThreshold: 100,
      },
    });

    expect(writes).toEqual(rawSecrets);
    expect(config.bucc.name).toBe("harbour-bucc");
    const serialized = JSON.stringify(config);
    for (const raw of rawSecrets) expect(serialized).not.toContain(raw);
    expect(serialized).toContain("arn:aws:secretsmanager");
  });

  it("normalizes safe names and rejects empty normalized values", () => {
    expect(normalizeName("  Harbour   BUCC!! ")).toBe("harbour-bucc");
    expect(() => normalizeName("!!!")).toThrow("letters or numbers");
  });

  it("removes earlier credentials when a later secret write fails", async () => {
    const deleted: string[] = [];
    let writeCount = 0;
    const secrets: ProviderSecretStore = {
      async writeSecret() {
        writeCount += 1;
        if (writeCount === 2) throw new Error("redacted write failure");
        return "arn:created:kyc";
      },
      async deleteSecret(arn) {
        deleted.push(arn);
      },
    };
    await expect(
      assembleConfigs({
        identity: {
          accountId: "123456789012",
          arn: "arn:aws:sts::123456789012:assumed-role/operator/session",
        },
        secrets,
        answers: {
          name: "Harbour",
          region: "eu-west-2",
          contactEmail: "ops@example.com",
          mode: "practice",
          kycProvider: {
            provider: "kyc",
            mode: "credentials",
            credential: "kyc-secret",
          },
          financialProvider: {
            provider: "fiat",
            mode: "credentials",
            credential: "fiat-secret",
          },
          rpc: { mode: "public", endpoint: "https://sepolia.base.org" },
          reviewCadenceHours: 168,
          budgetThreshold: 100,
        },
      }),
    ).rejects.toThrow("redacted write failure");
    expect(deleted).toEqual(["arn:created:kyc"]);
  });
});

describe("installer orchestration", () => {
  it("performs no writes or provisioning when account confirmation is rejected", async () => {
    let writes = 0;
    let provisions = 0;
    const dependencies = baseInstallerDependencies();
    dependencies.presenter.confirmAccount = async () => false;
    dependencies.secrets.writeSecret = async () => {
      writes += 1;
      return "arn:secret";
    };
    dependencies.provisioner.provision = async () => {
      provisions += 1;
      return foundationResult;
    };

    await expect(runInstaller(dependencies)).rejects.toThrow(
      "Installation cancelled",
    );
    expect(writes).toBe(0);
    expect(provisions).toBe(0);
  });

  it("stops before confirmation when the ambient AWS account changes", async () => {
    let identityCall = 0;
    let confirmations = 0;
    const dependencies = baseInstallerDependencies();
    dependencies.identity.getIdentity = async () => ({
      accountId: identityCall++ === 0 ? "123456789012" : "210987654321",
      arn: "arn:aws:sts::123456789012:assumed-role/operator/session",
    });
    dependencies.presenter.confirmAccount = async () => {
      confirmations += 1;
      return true;
    };

    await expect(runInstaller(dependencies)).rejects.toThrow(
      "AWS account changed",
    );
    expect(confirmations).toBe(0);
  });

  it("orders confirmation, provisioning, deferred runtime, health, and summary", async () => {
    const calls: string[] = [];
    const dependencies = baseInstallerDependencies();
    dependencies.presenter.confirmAccount = async () => {
      calls.push("confirm");
      return true;
    };
    dependencies.provisioner.provision = async () => {
      calls.push("provision");
      return foundationResult;
    };
    dependencies.runtime.complete = async () => {
      calls.push("runtime");
      return {
        status: "deferred",
        missingComponents: ["BuccApi", "BuccReviewAgent", "BuccMonitoring"],
      };
    };
    dependencies.health.run = async () => {
      calls.push("health");
      return { status: "unavailable", issue: 21 };
    };
    dependencies.presenter.summary = () => calls.push("summary");

    await runInstaller(dependencies);

    expect(calls).toEqual([
      "confirm",
      "provision",
      "runtime",
      "health",
      "summary",
    ]);
  });

  it("cleans up credentials created before a failed foundation apply", async () => {
    const deleted: string[] = [];
    const dependencies = baseInstallerDependencies();
    dependencies.prompt = queuePrompt({
      inputs: [
        "Harbour",
        "eu-west-2",
        "ops@example.com",
        "real-kyc",
        "mock-fiat",
        "https://sepolia.base.org",
        "168",
        "100",
      ],
      selects: ["practice", "credentials", "sandbox", "public"],
      passwords: ["kyc-secret"],
    }).port;
    dependencies.secrets.writeSecret = async () => "arn:created:kyc";
    dependencies.secrets.deleteSecret = async (arn) => {
      deleted.push(arn);
    };
    dependencies.provisioner.provision = async () => {
      throw new Error("foundation failed");
    };

    await expect(runInstaller(dependencies)).rejects.toThrow(
      "foundation failed",
    );
    expect(deleted).toEqual(["arn:created:kyc"]);
  });
});

function baseInstallerDependencies() {
  const prompt = queuePrompt({
    inputs: [
      "Harbour",
      "eu-west-2",
      "ops@example.com",
      "mock-kyc",
      "mock-fiat",
      "https://sepolia.base.org",
      "168",
      "100",
    ],
    selects: ["practice", "sandbox", "sandbox", "public"],
    passwords: [],
  }).port;
  const presenter: Presenter = {
    info: () => {},
    warn: () => {},
    confirmAccount: async () => true,
    summary: () => {},
  };
  return {
    pulumi: { ensureSupported: async () => command },
    identity: {
      getIdentity: async () => ({
        accountId: "123456789012",
        arn: "arn:aws:sts::123456789012:assumed-role/operator/session",
      }),
    },
    prompt,
    secrets: {
      writeSecret: async () => "arn:secret",
      deleteSecret: async () => {},
    },
    provisioner: { provision: async () => foundationResult },
    runtime: {
      complete: async () => ({
        status: "deferred" as const,
        missingComponents: [
          "BuccApi" as const,
          "BuccReviewAgent" as const,
          "BuccMonitoring" as const,
        ],
      }),
    },
    health: {
      run: async () => ({ status: "unavailable" as const, issue: 21 as const }),
    },
    presenter,
  };
}

const foundationResult = {
  status: "foundation-only" as const,
  backendRef: "s3://state",
  passphraseSecretRef: "arn:secret:passphrase",
  databaseRef: "database.internal:5432",
  reportsStorageRef: "arn:reports",
  exportsStorageRef: "arn:exports",
};

function queuePrompt(values: {
  readonly inputs: readonly string[];
  readonly selects: readonly string[];
  readonly passwords: readonly string[];
}): {
  readonly port: PromptPort;
  readonly passwordRequests: Array<{ readonly mask: string }>;
} {
  const inputs = [...values.inputs];
  const selects = [...values.selects];
  const passwords = [...values.passwords];
  const passwordRequests: Array<{ readonly mask: string }> = [];
  return {
    passwordRequests,
    port: {
      confirm: async () => true,
      input: async () => inputs.shift() ?? failQueue("input"),
      password: async (request) => {
        passwordRequests.push({ mask: request.mask });
        return passwords.shift() ?? failQueue("password");
      },
      select: async <TValue extends string>() =>
        (selects.shift() ?? failQueue("select")) as TValue,
    },
  };
}

function failQueue(kind: string): never {
  throw new Error(`Missing queued ${kind} answer`);
}
