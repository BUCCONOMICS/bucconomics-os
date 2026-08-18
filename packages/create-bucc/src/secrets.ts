import {
  CreateSecretCommand,
  DeleteSecretCommand,
  SecretsManagerClient,
} from "@aws-sdk/client-secrets-manager";

import type { ProviderSecretStore } from "./types.js";

export function createProviderSecretStore(): ProviderSecretStore {
  return {
    async writeSecret(input): Promise<string> {
      try {
        const response = await new SecretsManagerClient({
          region: input.region,
        }).send(
          new CreateSecretCommand({
            Name: `/bucconomics/${input.buccName}/providers/${input.kind}`,
            Description: `${input.provider} credential for ${input.buccName}`,
            SecretString: input.value,
            Tags: [
              { Key: "Project", Value: "bucconomics" },
              { Key: "BUCC", Value: input.buccName },
              { Key: "ManagedBy", Value: "create-bucc" },
            ],
          }),
        );
        if (!response.ARN) {
          throw new Error("missing secret ARN");
        }
        return response.ARN;
      } catch {
        throw new Error(
          `Could not store the ${input.kind} provider credential. The secret was not created.`,
        );
      }
    },
    async deleteSecret(arn, region): Promise<void> {
      try {
        await new SecretsManagerClient({ region }).send(
          new DeleteSecretCommand({
            SecretId: arn,
            ForceDeleteWithoutRecovery: true,
          }),
        );
      } catch {
        throw new Error("Could not clean up a provider credential secret");
      }
    },
  };
}
