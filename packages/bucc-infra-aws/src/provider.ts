import * as aws from "@pulumi/aws";

export function createProvider(
  region: string,
  expectedAccountId: string,
): aws.Provider {
  return new aws.Provider(`bucc-${region}-${expectedAccountId}`, {
    region,
    allowedAccountIds: [expectedAccountId],
  });
}
