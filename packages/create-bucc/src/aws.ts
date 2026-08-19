import { GetCallerIdentityCommand, STSClient } from "@aws-sdk/client-sts";

import type { AwsIdentity, AwsIdentityPort } from "./types.js";

export function createAwsIdentityPort(): AwsIdentityPort {
  return {
    async getIdentity(region): Promise<AwsIdentity> {
      try {
        const result = await new STSClient({ region }).send(
          new GetCallerIdentityCommand({}),
        );
        if (!result.Account || !result.Arn) {
          throw new Error("missing identity fields");
        }
        return { accountId: result.Account, arn: result.Arn };
      } catch {
        throw new Error(
          "AWS credentials are unavailable. Open AWS CloudShell or configure the ambient AWS credential chain.",
        );
      }
    },
  };
}
