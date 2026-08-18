import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";

export function tags(buccName: string): Record<string, string> {
  return {
    Project: "bucconomics",
    BUCC: buccName,
    ManagedBy: "pulumi",
  };
}

export function mergeProvider(
  provider: aws.Provider,
  opts?: pulumi.ComponentResourceOptions,
): pulumi.ComponentResourceOptions {
  return { ...opts, provider: opts?.provider ?? provider };
}

export function childOptions(
  parent: pulumi.ComponentResource,
  opts?: pulumi.ComponentResourceOptions,
  additional?: pulumi.CustomResourceOptions,
): pulumi.CustomResourceOptions {
  return { ...opts, ...additional, parent };
}
