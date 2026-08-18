import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";
import { BuccStorage, type BuccStorageInputs } from "@repo/bucc-infra";

import { childOptions, tags } from "./shared.js";

export class AwsBuccStorage extends BuccStorage {
  readonly reportsStorageRef: pulumi.Output<string>;
  readonly exportsStorageRef: pulumi.Output<string>;

  constructor(
    name: string,
    inputs: BuccStorageInputs,
    opts?: pulumi.ComponentResourceOptions,
  ) {
    super(name, inputs, opts);
    const reports = createSecureBucket(
      `${name}-reports`,
      inputs.name,
      inputs.keyring.atRestKeyRef,
      this,
      opts,
    );
    const exportsBucket = createSecureBucket(
      `${name}-exports`,
      inputs.name,
      inputs.keyring.atRestKeyRef,
      this,
      opts,
    );

    this.reportsStorageRef = reports.arn;
    this.exportsStorageRef = exportsBucket.arn;
    this.registerOutputs({
      reportsStorageRef: this.reportsStorageRef,
      exportsStorageRef: this.exportsStorageRef,
    });
  }
}

function createSecureBucket(
  name: string,
  buccName: string,
  keyRef: pulumi.Input<string>,
  parent: pulumi.ComponentResource,
  opts?: pulumi.ComponentResourceOptions,
): aws.s3.Bucket {
  const resourceTags = tags(buccName);
  const bucket = new aws.s3.Bucket(
    name,
    { forceDestroy: false, tags: resourceTags },
    childOptions(parent, opts),
  );
  new aws.s3.BucketVersioning(
    `${name}-versioning`,
    {
      bucket: bucket.id,
      versioningConfiguration: { status: "Enabled" },
    },
    childOptions(parent, opts),
  );
  new aws.s3.BucketServerSideEncryptionConfiguration(
    `${name}-encryption`,
    {
      bucket: bucket.id,
      rules: [
        {
          applyServerSideEncryptionByDefault: {
            sseAlgorithm: "aws:kms",
            kmsMasterKeyId: keyRef,
          },
          bucketKeyEnabled: true,
        },
      ],
    },
    childOptions(parent, opts),
  );
  new aws.s3.BucketPublicAccessBlock(
    `${name}-public-access`,
    {
      bucket: bucket.id,
      blockPublicAcls: true,
      blockPublicPolicy: true,
      ignorePublicAcls: true,
      restrictPublicBuckets: true,
    },
    childOptions(parent, opts),
  );
  new aws.s3.BucketOwnershipControls(
    `${name}-ownership`,
    { bucket: bucket.id, rule: { objectOwnership: "BucketOwnerEnforced" } },
    childOptions(parent, opts),
  );
  new aws.s3.BucketPolicy(
    `${name}-tls-policy`,
    { bucket: bucket.id, policy: tlsOnlyPolicy(bucket.arn) },
    childOptions(parent, opts),
  );
  return bucket;
}

function tlsOnlyPolicy(bucketArn: pulumi.Input<string>): pulumi.Output<string> {
  return pulumi.output(bucketArn).apply((arn) =>
    JSON.stringify({
      Version: "2012-10-17",
      Statement: [
        {
          Sid: "DenyInsecureTransport",
          Effect: "Deny",
          Principal: "*",
          Action: "s3:*",
          Resource: [arn, `${arn}/*`],
          Condition: { Bool: { "aws:SecureTransport": "false" } },
        },
      ],
    }),
  );
}
