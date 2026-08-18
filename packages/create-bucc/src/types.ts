import type { BuccConfig } from "@repo/bucc-infra";
import type { AwsFoundationConfig } from "@repo/bucc-infra-aws";
import type { PulumiCommand } from "@pulumi/pulumi/automation/index.js";

export interface PromptPort {
  confirm(input: ConfirmPromptInput): Promise<boolean>;
  input(input: TextPromptInput): Promise<string>;
  password(input: PasswordPromptInput): Promise<string>;
  select<TValue extends string>(
    input: SelectPromptInput<TValue>,
  ): Promise<TValue>;
}

export interface ConfirmPromptInput {
  readonly message: string;
  readonly initial: boolean;
}

export interface TextPromptInput {
  readonly message: string;
  readonly initial?: string;
}

export interface PasswordPromptInput {
  readonly message: string;
  readonly mask: string;
}

export interface SelectPromptOption<TValue extends string> {
  readonly value: TValue;
  readonly label: string;
}

export interface SelectPromptInput<TValue extends string> {
  readonly message: string;
  readonly choices: readonly SelectPromptOption<TValue>[];
}

export type ProviderAnswer =
  | { readonly provider: string; readonly mode: "sandbox" }
  | {
      readonly provider: string;
      readonly mode: "credentials";
      readonly credential: string;
    };

export type RpcAnswer =
  | { readonly mode: "public"; readonly endpoint: string }
  | {
      readonly mode: "credentials";
      readonly provider: string;
      readonly credential: string;
    };

export interface WizardAnswers {
  readonly name: string;
  readonly region: string;
  readonly contactEmail: string;
  readonly mode: "practice" | "live";
  readonly kycProvider: ProviderAnswer;
  readonly financialProvider: ProviderAnswer;
  readonly rpc: RpcAnswer;
  readonly reviewCadenceHours: number;
  readonly budgetThreshold: number;
}

export interface AwsIdentity {
  readonly accountId: string;
  readonly arn: string;
}

export interface AwsIdentityPort {
  getIdentity(region?: string): Promise<AwsIdentity>;
}

export interface ProviderSecretStore {
  writeSecret(input: {
    readonly buccName: string;
    readonly kind: "kyc" | "financial" | "rpc";
    readonly provider: string;
    readonly value: string;
    readonly region: string;
  }): Promise<string>;
  deleteSecret(arn: string, region: string): Promise<void>;
}

export interface PulumiCliPort {
  ensureSupported(): Promise<PulumiCommand>;
}

export interface AssembledInstallerConfig {
  readonly bucc: BuccConfig;
  readonly aws: AwsFoundationConfig;
  readonly createdSecretRefs: readonly string[];
}

export interface FoundationResult {
  readonly status: "foundation-only";
  readonly backendRef: string;
  readonly passphraseSecretRef: string;
  readonly databaseRef: string;
  readonly reportsStorageRef: string;
  readonly exportsStorageRef: string;
  readonly recoveryPath?: string;
}

export interface FoundationProvisioner {
  provision(input: {
    readonly config: AwsFoundationConfig;
    readonly command: PulumiCommand;
  }): Promise<FoundationResult>;
}

export interface RuntimeCompletionResult {
  readonly status: "deferred";
  readonly missingComponents: readonly [
    "BuccApi",
    "BuccReviewAgent",
    "BuccMonitoring",
  ];
}

export interface RuntimeCompleter {
  complete(input: {
    readonly config: BuccConfig;
    readonly foundation: FoundationResult;
  }): Promise<RuntimeCompletionResult>;
}

export interface HealthCheckResult {
  readonly status: "unavailable";
  readonly issue: 21;
}

export interface HealthChecker {
  run(input: {
    readonly foundation: FoundationResult;
  }): Promise<HealthCheckResult>;
}

export interface Presenter {
  info(message: string): void;
  warn(message: string): void;
  confirmAccount(input: {
    readonly accountId: string;
    readonly region: string;
    readonly mode: "practice" | "live";
  }): Promise<boolean>;
  summary(input: InstallerResult): void;
}

export interface InstallerResult {
  readonly accountId: string;
  readonly region: string;
  readonly mode: "practice" | "live";
  readonly config: AssembledInstallerConfig;
  readonly foundation: FoundationResult;
  readonly runtime: RuntimeCompletionResult;
  readonly health: HealthCheckResult;
}
