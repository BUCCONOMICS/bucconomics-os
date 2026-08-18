import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";
import { BuccDatabase, type BuccDatabaseInputs } from "@repo/bucc-infra";
import { fileURLToPath } from "node:url";

import type { AwsFoundationConfig } from "./config/schema.js";
import { childOptions, tags } from "./shared.js";

const migrationBundlePath = fileURLToPath(
  new URL("../dist/migrations", import.meta.url),
);

export class AwsBuccDatabase extends BuccDatabase {
  readonly databaseRef: pulumi.Output<string>;
  readonly connectionSecretRef: pulumi.Output<string>;
  readonly migrationRef: pulumi.Output<string>;

  constructor(
    name: string,
    inputs: BuccDatabaseInputs,
    config: AwsFoundationConfig,
    opts?: pulumi.ComponentResourceOptions,
  ) {
    super(name, inputs, opts);
    const resourceTags = tags(inputs.name);
    const subnetGroup = new aws.rds.SubnetGroup(
      `${name}-subnets`,
      {
        subnetIds: inputs.network.privateSubnetRefs.apply((subnets) => [
          ...subnets,
        ]),
        tags: resourceTags,
      },
      childOptions(this, opts),
    );
    const parameterGroup = new aws.rds.ParameterGroup(
      `${name}-parameters`,
      {
        family: "postgres16",
        parameters: [{ name: "rds.force_ssl", value: "1" }],
        tags: resourceTags,
      },
      childOptions(this, opts),
    );
    const database = new aws.rds.Instance(
      `${name}-database`,
      {
        engine: "postgres",
        engineVersion: "16",
        instanceClass: config.dbInstanceClass,
        allocatedStorage: config.dbAllocatedStorageGiB,
        storageType: "gp3",
        storageEncrypted: true,
        kmsKeyId: inputs.keyring.atRestKeyRef,
        backupRetentionPeriod: config.dbBackupRetentionDays,
        deleteAutomatedBackups: false,
        deletionProtection: true,
        copyTagsToSnapshot: true,
        skipFinalSnapshot: false,
        finalSnapshotIdentifier: `${name}-final-snapshot`,
        publiclyAccessible: false,
        multiAz: config.mode === "live",
        dbName: "bucc",
        username: "buccadmin",
        manageMasterUserPassword: true,
        masterUserSecretKmsKeyId: inputs.keyring.atRestKeyRef,
        dbSubnetGroupName: subnetGroup.name,
        vpcSecurityGroupIds: [inputs.network.databaseSecurityGroupRef],
        parameterGroupName: parameterGroup.name,
        tags: resourceTags,
      },
      childOptions(this, opts),
    );
    const secretArn = database.masterUserSecrets.apply((secrets) => {
      const secret = secrets[0];
      if (!secret) {
        throw new Error("RDS did not return a managed master-user secret");
      }
      return secret.secretArn;
    });

    const migrationRole = new aws.iam.Role(
      `${name}-migration-role`,
      {
        assumeRolePolicy: aws.iam.assumeRolePolicyForPrincipal({
          Service: "lambda.amazonaws.com",
        }),
        tags: resourceTags,
      },
      childOptions(this, opts),
    );
    const vpcAccessPolicy = new aws.iam.RolePolicyAttachment(
      `${name}-migration-vpc-access`,
      {
        role: migrationRole.name,
        policyArn:
          "arn:aws:iam::aws:policy/service-role/AWSLambdaVPCAccessExecutionRole",
      },
      childOptions(this, opts),
    );
    const secretsPolicy = new aws.iam.RolePolicy(
      `${name}-migration-secrets`,
      {
        role: migrationRole.id,
        policy: pulumi
          .all([secretArn, inputs.keyring.atRestKeyRef])
          .apply(([secret, key]) =>
            JSON.stringify({
              Version: "2012-10-17",
              Statement: [
                {
                  Effect: "Allow",
                  Action: "secretsmanager:GetSecretValue",
                  Resource: secret,
                },
                {
                  Effect: "Allow",
                  Action: "kms:Decrypt",
                  Resource: key,
                  Condition: {
                    StringEquals: {
                      "kms:ViaService": `secretsmanager.${inputs.region}.amazonaws.com`,
                    },
                  },
                },
              ],
            }),
          ),
      },
      childOptions(this, opts),
    );

    const migrationFunction = new aws.lambda.Function(
      `${name}-migrations`,
      {
        role: migrationRole.arn,
        runtime: "nodejs22.x",
        handler: "index.handler",
        code: new pulumi.asset.FileArchive(migrationBundlePath),
        memorySize: config.lambdaMemorySize,
        timeout: config.lambdaTimeoutSeconds,
        publish: true,
        vpcConfig: {
          subnetIds: inputs.network.privateSubnetRefs.apply((subnets) => [
            ...subnets,
          ]),
          securityGroupIds: [inputs.network.apiSecurityGroupRef],
        },
        environment: {
          variables: {
            NODE_EXTRA_CA_CERTS: "/var/runtime/ca-cert.pem",
          },
        },
        tags: resourceTags,
      },
      childOptions(this, opts, {
        dependsOn: [database, vpcAccessPolicy, secretsPolicy],
      }),
    );
    const migrationInvocation = new aws.lambda.Invocation(
      `${name}-migrations`,
      {
        functionName: migrationFunction.name,
        qualifier: migrationFunction.version,
        lifecycleScope: "CREATE_ONLY",
        input: pulumi
          .all([secretArn, database.address])
          .apply(([secret, endpoint]) =>
            JSON.stringify({ secretArn: secret, endpoint, dbName: "bucc" }),
          ),
        triggers: { sourceCodeHash: migrationFunction.codeSha256 },
      },
      childOptions(this, opts),
    );

    this.databaseRef = database.endpoint;
    this.connectionSecretRef = secretArn;
    this.migrationRef = migrationInvocation.result;
    this.registerOutputs({
      databaseRef: this.databaseRef,
      connectionSecretRef: this.connectionSecretRef,
      migrationRef: this.migrationRef,
    });
  }
}
