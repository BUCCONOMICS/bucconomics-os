import * as aws from "@pulumi/aws";

const providerCache = new Map<string, aws.Provider>();

export function getProvider(
  region: string,
  expectedAccountId: string,
): aws.Provider {
  const key = `${region}:${expectedAccountId}`;
  let provider = providerCache.get(key);
  if (!provider) {
    provider = new aws.Provider(`bucc-${region}-${expectedAccountId}`, {
      region,
      allowedAccountIds: [expectedAccountId],
    });
    providerCache.set(key, provider);
  }
  return provider;
}
