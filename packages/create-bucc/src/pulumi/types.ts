import type { AwsFoundationConfig } from "@repo/bucc-infra-aws";
import type { PulumiCommand } from "@pulumi/pulumi/automation/index.js";

export interface AutomationDriver {
  upBootstrap(input: AutomationUpInput): Promise<Record<string, unknown>>;
  upFoundation(
    input: AutomationUpInput & { readonly backendUrl: string },
  ): Promise<Record<string, unknown>>;
}

export interface AutomationUpInput {
  readonly config: AwsFoundationConfig;
  readonly stackName: string;
  readonly projectName: string;
  readonly workDir: string;
  readonly passphrase: string;
  readonly command: PulumiCommand;
  readonly onUpdateStart: () => void;
}

export interface MigrationDriver {
  migrate(input: MigrationInput): Promise<void>;
  rotatePassphrase(input: RotationInput): Promise<void>;
}

export interface MigrationInput {
  readonly command: string;
  readonly cwd: string;
  readonly stackName: string;
  readonly sourceBackendUrl: string;
  readonly targetBackendUrl: string;
  readonly temporaryPassphrase: string;
}

export interface RotationInput {
  readonly command: string;
  readonly cwd: string;
  readonly stackName: string;
  readonly targetBackendUrl: string;
  readonly temporaryPassphrase: string;
  readonly permanentPassphrase: string;
}

export interface BackendSecretReader {
  readPassphrase(input: {
    readonly arn: string;
    readonly region: string;
  }): Promise<string>;
}

export interface TemporaryWorkspace {
  readonly path: string;
  readonly localStatePath: string;
  cleanup(): Promise<void>;
}

export interface TemporaryWorkspaceFactory {
  create(): Promise<TemporaryWorkspace>;
}
