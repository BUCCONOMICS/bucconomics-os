import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";
import { BuccKeyring, type BuccKeyringInputs } from "@repo/bucc-infra";

import type { AwsFoundationConfig } from "./config/schema.js";
import { childOptions, tags } from "./shared.js";

export class AwsBuccKeyring extends BuccKeyring {
  readonly atRestKeyRef: pulumi.Output<string>;
  readonly fieldLevelKeyRef: pulumi.Output<string>;

  constructor(
    name: string,
    inputs: BuccKeyringInputs,
    config: AwsFoundationConfig,
    opts?: pulumi.ComponentResourceOptions,
  ) {
    super(name, inputs, opts);
    const resourceTags = tags(inputs.name);
    const policy = accountLocalKeyPolicy(config.expectedAccountId);
    const atRest = createKey(
      `${name}-at-rest`,
      policy,
      resourceTags,
      this,
      opts,
    );
    const fieldLevel = createKey(
      `${name}-field-level`,
      policy,
      resourceTags,
      this,
      opts,
    );
    new aws.kms.Alias(
      `${name}-at-rest-alias`,
      { name: `alias/${name}-at-rest`, targetKeyId: atRest.keyId },
      childOptions(this, opts),
    );
    new aws.kms.Alias(
      `${name}-field-level-alias`,
      { name: `alias/${name}-field-level`, targetKeyId: fieldLevel.keyId },
      childOptions(this, opts),
    );

    this.atRestKeyRef = atRest.arn;
    this.fieldLevelKeyRef = fieldLevel.arn;
    this.registerOutputs({
      atRestKeyRef: this.atRestKeyRef,
      fieldLevelKeyRef: this.fieldLevelKeyRef,
    });
  }
}

function createKey(
  name: string,
  policy: string,
  resourceTags: Record<string, string>,
  parent: pulumi.ComponentResource,
  opts?: pulumi.ComponentResourceOptions,
): aws.kms.Key {
  return new aws.kms.Key(
    name,
    {
      description: `${name} BUCC operator-owned key`,
      deletionWindowInDays: 30,
      enableKeyRotation: true,
      multiRegion: false,
      policy,
      tags: resourceTags,
    },
    childOptions(parent, opts),
  );
}

function accountLocalKeyPolicy(expectedAccountId: string): string {
  return JSON.stringify({
    Version: "2012-10-17",
    Statement: [
      {
        Sid: "AllowOperatorAccountAdministration",
        Effect: "Allow",
        Principal: {
          AWS: `arn:aws:iam::${expectedAccountId}:root`,
        },
        Action: "kms:*",
        Resource: "*",
      },
    ],
  });
}
