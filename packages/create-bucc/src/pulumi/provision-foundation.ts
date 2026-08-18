import { randomBytes } from "node:crypto";
import { pathToFileURL } from "node:url";
import { z } from "zod";

import type { FoundationProvisioner, FoundationResult } from "../types.js";
import type {
  AutomationDriver,
  BackendSecretReader,
  MigrationDriver,
  TemporaryWorkspaceFactory,
} from "./types.js";

const bootstrapOutputsSchema = z.object({
  backendRef: z.string().startsWith("s3://"),
  passphraseSecretRef: z.string().startsWith("arn:"),
});

const foundationOutputsSchema = bootstrapOutputsSchema.extend({
  databaseRef: z.string().min(1),
  reportsStorageRef: z.string().min(1),
  exportsStorageRef: z.string().min(1),
});

export function createFoundationProvisioner(dependencies: {
  readonly automation: AutomationDriver;
  readonly migration: MigrationDriver;
  readonly secretReader: BackendSecretReader;
  readonly workspaces: TemporaryWorkspaceFactory;
}): FoundationProvisioner {
  return {
    async provision({ config, command }): Promise<FoundationResult> {
      const workspace = await dependencies.workspaces.create();
      const temporaryPassphrase = randomBytes(32).toString("base64url");
      const stackName = `${config.name}-foundation`;
      const projectName = `${config.name}-bucc`;
      const localBackendUrl = pathToFileURL(workspace.localStatePath).href;
      let migrationStarted = false;

      try {
        const bootstrap = bootstrapOutputsSchema.parse(
          await dependencies.automation.upBootstrap({
            config,
            stackName,
            projectName,
            workDir: workspace.path,
            passphrase: temporaryPassphrase,
            command,
          }),
        );
        const permanentPassphrase =
          await dependencies.secretReader.readPassphrase({
            arn: bootstrap.passphraseSecretRef,
            region: config.region,
          });

        migrationStarted = true;
        await dependencies.migration.migrate({
          command: command.command,
          cwd: workspace.path,
          stackName,
          sourceBackendUrl: localBackendUrl,
          targetBackendUrl: bootstrap.backendRef,
          temporaryPassphrase,
        });
        await dependencies.migration.rotatePassphrase({
          command: command.command,
          cwd: workspace.path,
          stackName,
          targetBackendUrl: bootstrap.backendRef,
          temporaryPassphrase,
          permanentPassphrase,
        });
        const foundation = foundationOutputsSchema.parse(
          await dependencies.automation.upFoundation({
            config,
            stackName,
            projectName,
            workDir: workspace.path,
            passphrase: permanentPassphrase,
            command,
            backendUrl: bootstrap.backendRef,
          }),
        );
        await workspace.cleanup();
        return {
          status: "foundation-only",
          backendRef: foundation.backendRef,
          passphraseSecretRef: foundation.passphraseSecretRef,
          databaseRef: foundation.databaseRef,
          reportsStorageRef: foundation.reportsStorageRef,
          exportsStorageRef: foundation.exportsStorageRef,
        };
      } catch {
        if (!migrationStarted) {
          await workspace.cleanup();
          throw new Error(
            "Foundation provisioning failed before state migration",
          );
        }
        throw new Error(
          `Foundation provisioning needs recovery. Encrypted recovery state remains at ${workspace.path}`,
        );
      }
    },
  };
}
