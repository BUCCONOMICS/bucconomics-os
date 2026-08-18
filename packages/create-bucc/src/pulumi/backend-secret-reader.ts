import {
  GetSecretValueCommand,
  SecretsManagerClient,
} from "@aws-sdk/client-secrets-manager";

import type { BackendSecretReader } from "./types.js";

export function createBackendSecretReader(): BackendSecretReader {
  return {
    async readPassphrase(input): Promise<string> {
      try {
        const result = await new SecretsManagerClient({
          region: input.region,
        }).send(new GetSecretValueCommand({ SecretId: input.arn }));
        if (!result.SecretString) {
          throw new Error("missing secret value");
        }
        return result.SecretString;
      } catch {
        throw new Error("Could not retrieve the Pulumi state passphrase");
      }
    },
  };
}
