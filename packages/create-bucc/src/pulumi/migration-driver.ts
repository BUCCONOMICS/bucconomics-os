import type {
  MigrationDriver,
  MigrationInput,
  RotationInput,
} from "./types.js";
import type { ProcessRunner } from "./process-runner.js";

export function createMigrationDriver(runner: ProcessRunner): MigrationDriver {
  return {
    async migrate(input) {
      await runner.run({
        command: input.command,
        args: migrationArgs(input),
        cwd: input.cwd,
        env: secretEnvironment(
          input.targetBackendUrl,
          input.temporaryPassphrase,
        ),
      });
    },
    async rotatePassphrase(input) {
      await runner.run({
        command: input.command,
        args: rotationArgs(input),
        cwd: input.cwd,
        env: secretEnvironment(
          input.targetBackendUrl,
          input.temporaryPassphrase,
        ),
        stdin: `${input.permanentPassphrase}\n${input.permanentPassphrase}\n`,
      });
    },
  };
}

function migrationArgs(input: MigrationInput): readonly string[] {
  return [
    "stack",
    "migrate",
    input.sourceBackendUrl,
    input.stackName,
    "--target",
    input.stackName,
    "--secrets-provider",
    "passphrase",
    "--yes",
    "--non-interactive",
    "--color",
    "never",
  ];
}

function rotationArgs(input: RotationInput): readonly string[] {
  return [
    "stack",
    "change-secrets-provider",
    "passphrase",
    "--stack",
    input.stackName,
    "--non-interactive",
    "--color",
    "never",
  ];
}

function secretEnvironment(
  backendUrl: string,
  passphrase: string,
): NodeJS.ProcessEnv {
  return {
    ...process.env,
    PULUMI_BACKEND_URL: backendUrl,
    PULUMI_CONFIG_PASSPHRASE: passphrase,
    PULUMI_SKIP_UPDATE_CHECK: "true",
  };
}
