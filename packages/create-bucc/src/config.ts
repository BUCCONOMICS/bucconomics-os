import { parseBuccConfig } from "@repo/bucc-infra";
import { parseAwsFoundationConfig } from "@repo/bucc-infra-aws";

import type {
  AssembledInstallerConfig,
  AwsIdentity,
  ProviderAnswer,
  ProviderSecretStore,
  RpcAnswer,
  WizardAnswers,
} from "./types.js";

export async function assembleConfigs(input: {
  readonly answers: WizardAnswers;
  readonly identity: AwsIdentity;
  readonly secrets: ProviderSecretStore;
}): Promise<AssembledInstallerConfig> {
  const name = normalizeName(input.answers.name);
  validateBeforeSecretWrites(input.answers, input.identity, name);
  const createdSecretRefs: string[] = [];
  try {
    const kycProvider = await storeProvider(
      input.answers.kycProvider,
      "kyc",
      name,
      input.answers.region,
      input.secrets,
      createdSecretRefs,
    );
    const financialProvider = await storeProvider(
      input.answers.financialProvider,
      "financial",
      name,
      input.answers.region,
      input.secrets,
      createdSecretRefs,
    );
    const rpc = await storeRpc(
      input.answers.rpc,
      name,
      input.answers.region,
      input.secrets,
      createdSecretRefs,
    );

    const bucc = parseBuccConfig({
      name,
      region: input.answers.region,
      contactEmail: input.answers.contactEmail,
      mode: input.answers.mode,
      kycProvider,
      financialProvider,
      rpc,
      reviewCadenceHours: input.answers.reviewCadenceHours,
      budgetThreshold: input.answers.budgetThreshold,
    });
    const aws = parseAwsFoundationConfig({
      name,
      region: input.answers.region,
      expectedAccountId: input.identity.accountId,
      vpcCidr: "10.20.0.0/16",
      mode: input.answers.mode,
    });
    return { bucc, aws, createdSecretRefs };
  } catch (error) {
    await Promise.allSettled(
      createdSecretRefs.map((arn) =>
        input.secrets.deleteSecret(arn, input.answers.region),
      ),
    );
    throw error;
  }
}

function validateBeforeSecretWrites(
  answers: WizardAnswers,
  identity: AwsIdentity,
  name: string,
): void {
  const placeholderSecretRef = "pending-secret-write";
  parseBuccConfig({
    name,
    region: answers.region,
    contactEmail: answers.contactEmail,
    mode: answers.mode,
    kycProvider:
      answers.kycProvider.mode === "sandbox"
        ? answers.kycProvider
        : {
            provider: answers.kycProvider.provider,
            mode: "credentials",
            credentialSecretRef: placeholderSecretRef,
          },
    financialProvider:
      answers.financialProvider.mode === "sandbox"
        ? answers.financialProvider
        : {
            provider: answers.financialProvider.provider,
            mode: "credentials",
            credentialSecretRef: placeholderSecretRef,
          },
    rpc:
      answers.rpc.mode === "public"
        ? answers.rpc
        : {
            mode: "credentials",
            provider: answers.rpc.provider,
            credentialSecretRef: placeholderSecretRef,
          },
    reviewCadenceHours: answers.reviewCadenceHours,
    budgetThreshold: answers.budgetThreshold,
  });
  parseAwsFoundationConfig({
    name,
    region: answers.region,
    expectedAccountId: identity.accountId,
    vpcCidr: "10.20.0.0/16",
    mode: answers.mode,
  });
}

export function normalizeName(value: string): string {
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
  if (!normalized) {
    throw new Error("BUCC name must contain letters or numbers");
  }
  return normalized;
}

async function storeProvider(
  answer: ProviderAnswer,
  kind: "kyc" | "financial",
  buccName: string,
  region: string,
  secrets: ProviderSecretStore,
  createdSecretRefs: string[],
) {
  if (answer.mode === "sandbox") {
    return answer;
  }
  const credentialSecretRef = await secrets.writeSecret({
    buccName,
    kind,
    provider: answer.provider,
    value: answer.credential,
    region,
  });
  createdSecretRefs.push(credentialSecretRef);
  return {
    provider: answer.provider,
    mode: "credentials" as const,
    credentialSecretRef,
  };
}

async function storeRpc(
  answer: RpcAnswer,
  buccName: string,
  region: string,
  secrets: ProviderSecretStore,
  createdSecretRefs: string[],
) {
  if (answer.mode === "public") {
    return answer;
  }
  const credentialSecretRef = await secrets.writeSecret({
    buccName,
    kind: "rpc",
    provider: answer.provider,
    value: answer.credential,
    region,
  });
  createdSecretRefs.push(credentialSecretRef);
  return {
    mode: "credentials" as const,
    provider: answer.provider,
    credentialSecretRef,
  };
}
