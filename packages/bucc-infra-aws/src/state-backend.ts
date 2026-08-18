import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";
import { RandomPassword } from "@pulumi/random";
import {
  BuccStateBackend,
  type BuccStateBackendInputs,
} from "@repo/bucc-infra";

import { childOptions, tags } from "./shared.js";

export class AwsBuccStateBackend extends BuccStateBackend {
  readonly backendRef: pulumi.Output<string>;
  readonly passphraseSecretRef: pulumi.Output<string>;

  constructor(
    name: string,
    inputs: BuccStateBackendInputs,
    opts?: pulumi.ComponentResourceOptions,
  ) {
    super(name, inputs, opts);
    const resourceTags = tags(inputs.name);
    const bucket = new aws.s3.Bucket(
      `${name}-state`,
      { forceDestroy: false, tags: resourceTags },
      childOptions(this, opts),
    );

    new aws.s3.BucketVersioning(
      `${name}-state-versioning`,
      {
        bucket: bucket.id,
        versioningConfiguration: { status: "Enabled" },
      },
      childOptions(this, opts),
    );
    new aws.s3.BucketServerSideEncryptionConfiguration(
      `${name}-state-encryption`,
      {
        bucket: bucket.id,
        rules: [
          {
            applyServerSideEncryptionByDefault: { sseAlgorithm: "AES256" },
          },
        ],
      },
      childOptions(this, opts),
    );
    new aws.s3.BucketPublicAccessBlock(
      `${name}-state-public-access`,
      {
        bucket: bucket.id,
        blockPublicAcls: true,
        blockPublicPolicy: true,
        ignorePublicAcls: true,
        restrictPublicBuckets: true,
      },
      childOptions(this, opts),
    );
    new aws.s3.BucketOwnershipControls(
      `${name}-state-ownership`,
      { bucket: bucket.id, rule: { objectOwnership: "BucketOwnerEnforced" } },
      childOptions(this, opts),
    );
    new aws.s3.BucketPolicy(
      `${name}-state-tls-policy`,
      {
        bucket: bucket.id,
        policy: tlsOnlyBucketPolicy(bucket.arn),
      },
      childOptions(this, opts),
    );

    const passphrase = new RandomPassword(
      `${name}-state-passphrase`,
      { length: 40, special: true },
      childOptions(this, opts),
    );
    const secret = new aws.secretsmanager.Secret(
      `${name}-state-passphrase`,
      { tags: resourceTags },
      childOptions(this, opts),
    );
    new aws.secretsmanager.SecretVersion(
      `${name}-state-passphrase-version`,
      { secretId: secret.id, secretString: passphrase.result },
      childOptions(this, opts),
    );

    this.backendRef = pulumi.interpolate`s3://${bucket.bucket}`;
    this.passphraseSecretRef = secret.arn;
    this.registerOutputs({
      backendRef: this.backendRef,
      passphraseSecretRef: this.passphraseSecretRef,
    });
  }
}

function tlsOnlyBucketPolicy(
  bucketArn: pulumi.Input<string>,
): pulumi.Output<string> {
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
