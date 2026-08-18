import { beforeAll, describe, expect, it } from "@jest/globals";
import * as pulumi from "@pulumi/pulumi";

import { parseAwsFoundationConfig } from "./config/schema.js";
import { createAwsFoundationImplementations } from "./factory.js";

interface MockResource {
  readonly type: string;
  readonly name: string;
  readonly inputs: Record<string, unknown>;
}

const resources: MockResource[] = [];

pulumi.runtime.setMocks({
  newResource: (args) => {
    const inputs = args.inputs as Record<string, unknown>;
    resources.push({ type: args.type, name: args.name, inputs });
    const state: Record<string, unknown> = { ...inputs };

    if (args.type === "aws:s3/bucket:Bucket") {
      state.bucket = args.name;
      state.arn = `arn:aws:s3:::${args.name}`;
    } else if (args.type === "aws:secretsmanager/secret:Secret") {
      state.arn = `arn:aws:secretsmanager:eu-west-2:123456789012:secret:${args.name}`;
    } else if (args.type === "random:index/randomPassword:RandomPassword") {
      state.result = "mock-passphrase-never-exported";
    } else if (args.type === "aws:kms/key:Key") {
      state.keyId = `${args.name}-key-id`;
      state.arn = `arn:aws:kms:eu-west-2:123456789012:key/${args.name}`;
    } else if (args.type === "aws:rds/instance:Instance") {
      state.address = `${args.name}.private.rds.amazonaws.com`;
      state.endpoint = `${args.name}.private.rds.amazonaws.com:5432`;
      state.masterUserSecrets = [
        {
          kmsKeyId: "at-rest-key",
          secretArn:
            "arn:aws:secretsmanager:eu-west-2:123456789012:secret:rds-master",
          secretStatus: "active",
        },
      ];
    } else if (args.type === "aws:lambda/function:Function") {
      state.name = args.name;
      state.arn = `arn:aws:lambda:eu-west-2:123456789012:function:${args.name}`;
      state.version = "1";
      state.codeSha256 = "mock-source-hash";
    } else if (args.type === "aws:lambda/invocation:Invocation") {
      state.result = JSON.stringify({ migrated: true });
    } else if (args.type === "aws:iam/role:Role") {
      state.name = args.name;
      state.arn = `arn:aws:iam::123456789012:role/${args.name}`;
    }

    return { id: args.custom ? `${args.name}-id` : undefined, state };
  },
  call: (args) => args.inputs,
});

const config = {
  name: "harbour",
  region: "eu-west-2",
  expectedAccountId: "123456789012",
  vpcCidr: "10.20.0.0/16",
  mode: "practice",
  dbAllocatedStorageGiB: 20,
  dbBackupRetentionDays: 7,
  dbInstanceClass: "db.t4g.medium",
  lambdaMemorySize: 512,
  lambdaTimeoutSeconds: 900,
} as const;

describe("AWS foundation configuration", () => {
  it("applies secure defaults and rejects invalid account/network input", () => {
    expect(
      parseAwsFoundationConfig({
        name: "harbour",
        region: "eu-west-2",
        expectedAccountId: "123456789012",
        vpcCidr: "10.20.0.0/16",
      }),
    ).toMatchObject({
      mode: "practice",
      dbBackupRetentionDays: 7,
      lambdaTimeoutSeconds: 900,
    });
    expect(() =>
      parseAwsFoundationConfig({
        name: "harbour",
        region: "eu-west-2",
        expectedAccountId: "external",
        vpcCidr: "0.0.0.0/0",
      }),
    ).toThrow();
  });
});

describe("AWS foundation resources", () => {
  beforeAll(async () => {
    resources.length = 0;
    const implementations = createAwsFoundationImplementations({ config });

    await pulumi.runtime.runInPulumiStack(async () => {
      const stateBackend = implementations.stateBackend(
        "harbour-state-backend",
        { name: "harbour", region: "eu-west-2" },
      );
      const network = implementations.network("harbour-network", {
        name: "harbour",
        region: "eu-west-2",
        stateBackend,
      });
      const keyring = implementations.keyring("harbour-keyring", {
        name: "harbour",
        region: "eu-west-2",
        network,
      });
      const storage = implementations.storage("harbour-storage", {
        name: "harbour",
        region: "eu-west-2",
        keyring,
      });
      const database = implementations.database("harbour-database", {
        name: "harbour",
        region: "eu-west-2",
        network,
        keyring,
        migrationSource: "@repo/db/migrations",
      });

      await Promise.all([
        resolveOutput(stateBackend.backendRef),
        resolveOutput(stateBackend.passphraseSecretRef),
        resolveOutput(network.databaseSecurityGroupRef),
        resolveOutput(keyring.atRestKeyRef),
        resolveOutput(storage.exportsStorageRef),
        resolveOutput(database.migrationRef),
      ]);
    });
  });

  it("guards the operator account and secures state bootstrap", () => {
    expect(find("bucc-eu-west-2-123456789012").inputs).toMatchObject({
      allowedAccountIds: JSON.stringify(["123456789012"]),
      region: "eu-west-2",
    });
    assertStateBackend();
  });

  it("creates isolated networking with database ingress from the API group only", () => {
    assertNetwork();
  });

  it("creates two rotating account-local keys", () => {
    assertKeyring();
  });

  it("creates encrypted, versioned reports and exports storage", () => {
    assertStorage();
  });

  it("creates private encrypted RDS and runs migrations from private compute", () => {
    assertDatabaseAndMigrations();
  });

  it("tags every taggable resource for cost attribution", () => {
    assertRequiredTags();
  });
});

function assertStateBackend(): void {
  expect(find("harbour-state-backend-state").inputs).toMatchObject({
    forceDestroy: false,
  });
  expect(find("harbour-state-backend-state-versioning").inputs).toMatchObject({
    versioningConfiguration: { status: "Enabled" },
  });
  expect(find("harbour-state-backend-state-encryption").inputs).toMatchObject({
    rules: [{ applyServerSideEncryptionByDefault: { sseAlgorithm: "AES256" } }],
  });
  assertPublicAccessBlocked("harbour-state-backend-state-public-access");
  expect(find("harbour-state-backend-state-ownership").inputs).toMatchObject({
    rule: { objectOwnership: "BucketOwnerEnforced" },
  });
  expect(policyFor("harbour-state-backend-state-tls-policy").Statement).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        Effect: "Deny",
        Condition: { Bool: { "aws:SecureTransport": "false" } },
      }),
    ]),
  );
}

function assertNetwork(): void {
  expect(find("harbour-network-vpc").inputs).toMatchObject({
    cidrBlock: "10.20.0.0/16",
  });
  for (const suffix of ["a", "b"]) {
    expect(find(`harbour-network-private-${suffix}`).inputs).toMatchObject({
      mapPublicIpOnLaunch: false,
    });
  }
  expect(find("harbour-network-private-routes").inputs).toMatchObject({
    routes: [],
  });
  const apiGroupId = "harbour-network-api-clients-id";
  expect(find("harbour-network-database-from-api").inputs).toMatchObject({
    ipProtocol: "tcp",
    fromPort: 5432,
    toPort: 5432,
    referencedSecurityGroupId: apiGroupId,
  });
  expect(find("harbour-network-database-from-api").inputs).not.toHaveProperty(
    "cidrIpv4",
  );
  expect(find("harbour-network-secrets-manager").inputs).toMatchObject({
    privateDnsEnabled: true,
    vpcEndpointType: "Interface",
    securityGroupIds: ["harbour-network-endpoints-id"],
  });
}

function assertKeyring(): void {
  const keys = resources.filter(({ type }) => type === "aws:kms/key:Key");
  expect(keys).toHaveLength(2);
  for (const key of keys) {
    expect(key.inputs).toMatchObject({
      deletionWindowInDays: 30,
      enableKeyRotation: true,
      multiRegion: false,
    });
    const policy = JSON.parse(String(key.inputs.policy)) as PolicyDocument;
    expect(policy.Statement[0]?.Principal).toEqual({
      AWS: "arn:aws:iam::123456789012:root",
    });
    expect(policy.Statement[0]?.Principal).not.toEqual({ AWS: "*" });
  }
}

function assertStorage(): void {
  for (const suffix of ["reports", "exports"]) {
    expect(find(`harbour-storage-${suffix}`).inputs).toMatchObject({
      forceDestroy: false,
    });
    expect(find(`harbour-storage-${suffix}-versioning`).inputs).toMatchObject({
      versioningConfiguration: { status: "Enabled" },
    });
    expect(find(`harbour-storage-${suffix}-encryption`).inputs).toMatchObject({
      rules: [
        {
          applyServerSideEncryptionByDefault: {
            sseAlgorithm: "aws:kms",
          },
          bucketKeyEnabled: true,
        },
      ],
    });
    assertPublicAccessBlocked(`harbour-storage-${suffix}-public-access`);
    expect(policyFor(`harbour-storage-${suffix}-tls-policy`).Statement).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ Effect: "Deny", Principal: "*" }),
      ]),
    );
  }
}

function assertDatabaseAndMigrations(): void {
  const database = find("harbour-database-database");
  expect(database.inputs).toMatchObject({
    engine: "postgres",
    publiclyAccessible: false,
    storageEncrypted: true,
    backupRetentionPeriod: 7,
    deleteAutomatedBackups: false,
    deletionProtection: true,
    skipFinalSnapshot: false,
    manageMasterUserPassword: true,
    multiAz: false,
    vpcSecurityGroupIds: ["harbour-network-database-id"],
  });
  expect(database.inputs).not.toHaveProperty("password");
  expect(find("harbour-database-parameters").inputs).toMatchObject({
    parameters: [{ name: "rds.force_ssl", value: "1" }],
  });

  const migrationFunction = find("harbour-database-migrations");
  expect(migrationFunction.inputs).toMatchObject({
    runtime: "nodejs22.x",
    vpcConfig: {
      securityGroupIds: ["harbour-network-api-clients-id"],
    },
    environment: {
      variables: { NODE_EXTRA_CA_CERTS: "/var/runtime/ca-cert.pem" },
    },
  });
  const environment = JSON.stringify(migrationFunction.inputs.environment);
  expect(environment).not.toContain("password");

  const invocation = find("harbour-database-migrations", 1);
  const input = JSON.parse(String(invocation.inputs.input)) as Record<
    string,
    unknown
  >;
  expect(input).toMatchObject({
    dbName: "bucc",
    endpoint: "harbour-database-database.private.rds.amazonaws.com",
  });
  expect(input.secretArn).toEqual(expect.stringContaining("secret:rds-master"));
  expect(input).not.toHaveProperty("password");
  expect(invocation.inputs).toMatchObject({
    triggers: { sourceCodeHash: "mock-source-hash" },
  });
}

function assertPublicAccessBlocked(name: string): void {
  expect(find(name).inputs).toMatchObject({
    blockPublicAcls: true,
    blockPublicPolicy: true,
    ignorePublicAcls: true,
    restrictPublicBuckets: true,
  });
}

function assertRequiredTags(): void {
  const taggable = resources.filter(({ inputs }) => "tags" in inputs);
  expect(taggable.length).toBeGreaterThan(10);
  for (const resource of taggable) {
    expect(resource.inputs.tags).toMatchObject({
      Project: "bucconomics",
      BUCC: "harbour",
      ManagedBy: "pulumi",
    });
  }
}

interface PolicyDocument {
  readonly Statement: ReadonlyArray<{
    readonly Principal?: unknown;
    readonly [key: string]: unknown;
  }>;
}

function policyFor(name: string): PolicyDocument {
  return JSON.parse(String(find(name).inputs.policy)) as PolicyDocument;
}

function find(name: string, occurrence = 0): MockResource {
  const matches = resources.filter((resource) => resource.name === name);
  const resource = matches[occurrence];
  if (!resource) {
    throw new Error(`Mock resource not found: ${name}[${occurrence}]`);
  }
  return resource;
}

function resolveOutput<T>(output: pulumi.Output<T>): Promise<T> {
  return new Promise((resolve) => {
    output.apply((value) => {
      resolve(value);
      return value;
    });
  });
}
