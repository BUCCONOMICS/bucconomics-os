import { describe, expect, it } from "@jest/globals";
import * as pulumi from "@pulumi/pulumi";

import type { BuccConfig } from "../../config/schema.js";
import {
  BUCC_API_TYPE,
  BUCC_DATABASE_MIGRATION_SOURCE,
  BUCC_DATABASE_TYPE,
  BUCC_KEYRING_TYPE,
  BUCC_MONITORING_TYPE,
  BUCC_NETWORK_TYPE,
  BUCC_REVIEW_AGENT_TYPE,
  BUCC_STATE_BACKEND_TYPE,
  BUCC_STORAGE_TYPE,
  BuccApi,
  type BuccApiInputs,
  BuccDatabase,
  type BuccDatabaseInputs,
  type BuccImplementationSet,
  BuccKeyring,
  type BuccKeyringInputs,
  BuccMonitoring,
  type BuccMonitoringInputs,
  BuccNetwork,
  type BuccNetworkInputs,
  BuccReviewAgent,
  type BuccReviewAgentInputs,
  BuccStateBackend,
  type BuccStateBackendInputs,
  BuccStorage,
  type BuccStorageInputs,
} from "../../interfaces.js";
import { buildBuccStack } from "./index.js";

const childResources: Array<{ readonly type: string; readonly name: string }> =
  [];

pulumi.runtime.setMocks({
  newResource: (args) => {
    childResources.push({ type: args.type, name: args.name });
    return {
      id: args.custom ? `${args.name}-id` : undefined,
      state: args.inputs,
    };
  },
  call: (args) => args.inputs,
});

class TestChild extends pulumi.CustomResource {
  readonly reference!: pulumi.Output<string>;

  constructor(name: string, parent: pulumi.ComponentResource) {
    super("test:bucc:Child", name, { reference: `${name}-ref` }, { parent });
  }
}

class TestStateBackend extends BuccStateBackend {
  readonly backendRef: pulumi.Output<string>;
  readonly passphraseSecretRef: pulumi.Output<string>;

  constructor(name: string, inputs: BuccStateBackendInputs) {
    super(name, inputs);
    const child = new TestChild(`${name}-child`, this);
    this.backendRef = child.reference;
    this.passphraseSecretRef = pulumi.output("secret://state-passphrase");
    this.registerOutputs(this);
  }
}

class TestNetwork extends BuccNetwork {
  readonly networkRef: pulumi.Output<string>;
  readonly privateSubnetRefs: pulumi.Output<readonly string[]>;
  readonly apiSecurityGroupRef: pulumi.Output<string>;

  constructor(name: string, inputs: BuccNetworkInputs) {
    super(name, inputs);
    const child = new TestChild(`${name}-child`, this);
    this.networkRef = child.reference;
    this.privateSubnetRefs = pulumi.output(["subnet-private"]);
    this.apiSecurityGroupRef = pulumi.output("security-group-api");
    this.registerOutputs(this);
  }
}

class TestKeyring extends BuccKeyring {
  readonly atRestKeyRef: pulumi.Output<string>;
  readonly fieldLevelKeyRef: pulumi.Output<string>;

  constructor(name: string, inputs: BuccKeyringInputs) {
    super(name, inputs);
    const child = new TestChild(`${name}-child`, this);
    this.atRestKeyRef = child.reference;
    this.fieldLevelKeyRef = pulumi.output("key-field-level");
    this.registerOutputs(this);
  }
}

class TestDatabase extends BuccDatabase {
  readonly databaseRef: pulumi.Output<string>;
  readonly connectionSecretRef: pulumi.Output<string>;
  readonly migrationRef: pulumi.Output<string>;

  constructor(name: string, inputs: BuccDatabaseInputs) {
    super(name, inputs);
    const child = new TestChild(`${name}-child`, this);
    this.databaseRef = child.reference;
    this.connectionSecretRef = pulumi.output("secret://database-connection");
    this.migrationRef = pulumi.output(inputs.migrationSource);
    this.registerOutputs(this);
  }
}

class TestStorage extends BuccStorage {
  readonly reportsStorageRef: pulumi.Output<string>;
  readonly exportsStorageRef: pulumi.Output<string>;

  constructor(name: string, inputs: BuccStorageInputs) {
    super(name, inputs);
    const child = new TestChild(`${name}-child`, this);
    this.reportsStorageRef = child.reference;
    this.exportsStorageRef = pulumi.output("storage-exports");
    this.registerOutputs(this);
  }
}

class TestApi extends BuccApi {
  readonly endpointRef: pulumi.Output<string>;
  readonly serviceIdentityRef: pulumi.Output<string>;

  constructor(name: string, inputs: BuccApiInputs) {
    super(name, inputs);
    const child = new TestChild(`${name}-child`, this);
    this.endpointRef = child.reference;
    this.serviceIdentityRef = pulumi.output("identity-api");
    this.registerOutputs(this);
  }
}

class TestReviewAgent extends BuccReviewAgent {
  readonly scheduleRef: pulumi.Output<string>;
  readonly reportDestinationRef: pulumi.Output<string>;
  readonly notificationRef: pulumi.Output<string>;

  constructor(name: string, inputs: BuccReviewAgentInputs) {
    super(name, inputs);
    const child = new TestChild(`${name}-child`, this);
    this.scheduleRef = child.reference;
    this.reportDestinationRef = inputs.storage.reportsStorageRef;
    this.notificationRef = pulumi.output("notification-review");
    this.registerOutputs(this);
  }
}

class TestMonitoring extends BuccMonitoring {
  readonly dashboardRef: pulumi.Output<string>;
  readonly budgetAlarmRef: pulumi.Output<string>;
  readonly notificationRef: pulumi.Output<string>;

  constructor(name: string, inputs: BuccMonitoringInputs) {
    super(name, inputs);
    const child = new TestChild(`${name}-child`, this);
    this.dashboardRef = child.reference;
    this.budgetAlarmRef = pulumi.output("alarm-budget");
    this.notificationRef = pulumi.output("notification-operator");
    this.registerOutputs(this);
  }
}

const config: BuccConfig = {
  name: "harbour",
  region: "eu-west-2",
  contactEmail: "ops@example.com",
  mode: "practice",
  kycProvider: { provider: "mock-kyc", mode: "sandbox" },
  financialProvider: { provider: "mock-fiat", mode: "sandbox" },
  rpc: { mode: "public", endpoint: "https://rpc.example.com" },
  reviewCadenceHours: 168,
  budgetThreshold: 100,
};

describe("buildBuccStack", () => {
  it("composes all eight component contracts without deploying", async () => {
    let stateBackendOpts: pulumi.ComponentResourceOptions | undefined;
    const calls: Array<{
      readonly component: keyof BuccImplementationSet;
      readonly name: string;
      readonly inputs: object;
    }> = [];
    const implementations: BuccImplementationSet = {
      stateBackend: (name, inputs, opts) => {
        calls.push({ component: "stateBackend", name, inputs });
        stateBackendOpts = opts;
        return new TestStateBackend(name, inputs);
      },
      network: (name, inputs) => {
        calls.push({ component: "network", name, inputs });
        return new TestNetwork(name, inputs);
      },
      keyring: (name, inputs) => {
        calls.push({ component: "keyring", name, inputs });
        return new TestKeyring(name, inputs);
      },
      database: (name, inputs) => {
        calls.push({ component: "database", name, inputs });
        return new TestDatabase(name, inputs);
      },
      storage: (name, inputs) => {
        calls.push({ component: "storage", name, inputs });
        return new TestStorage(name, inputs);
      },
      api: (name, inputs) => {
        calls.push({ component: "api", name, inputs });
        return new TestApi(name, inputs);
      },
      reviewAgent: (name, inputs) => {
        calls.push({ component: "reviewAgent", name, inputs });
        return new TestReviewAgent(name, inputs);
      },
      monitoring: (name, inputs) => {
        calls.push({ component: "monitoring", name, inputs });
        return new TestMonitoring(name, inputs);
      },
    };

    await pulumi.runtime.runInPulumiStack(async () => {
      const resources = buildBuccStack({
        config,
        implementations,
        opts: { protect: true },
      });
      const urns = await Promise.all(
        [
          resources.stateBackend,
          resources.network,
          resources.keyring,
          resources.storage,
          resources.database,
          resources.api,
          resources.reviewAgent,
          resources.monitoring,
        ].map((resource) => resolveOutput(resource.urn)),
      );

      expect(urns).toEqual(
        expect.arrayContaining([
          expect.stringContaining(BUCC_STATE_BACKEND_TYPE),
          expect.stringContaining(BUCC_NETWORK_TYPE),
          expect.stringContaining(BUCC_KEYRING_TYPE),
          expect.stringContaining(BUCC_STORAGE_TYPE),
          expect.stringContaining(BUCC_DATABASE_TYPE),
          expect.stringContaining(BUCC_API_TYPE),
          expect.stringContaining(BUCC_REVIEW_AGENT_TYPE),
          expect.stringContaining(BUCC_MONITORING_TYPE),
        ]),
      );
      await resolveOutput(resources.monitoring.notificationRef);
    });

    expect(calls.map(({ component }) => component)).toEqual([
      "stateBackend",
      "network",
      "keyring",
      "storage",
      "database",
      "api",
      "reviewAgent",
      "monitoring",
    ]);
    expect(calls.map(({ name }) => name)).toEqual([
      "harbour-state-backend",
      "harbour-network",
      "harbour-keyring",
      "harbour-storage",
      "harbour-database",
      "harbour-api",
      "harbour-review-agent",
      "harbour-monitoring",
    ]);
    expect(calls[4]?.inputs).toMatchObject({
      migrationSource: BUCC_DATABASE_MIGRATION_SOURCE,
    });
    expect(calls[5]?.inputs).toMatchObject({
      mode: "practice",
      kycProvider: config.kycProvider,
      financialProvider: config.financialProvider,
      rpc: config.rpc,
    });
    expect(stateBackendOpts).toMatchObject({ protect: true });
    expect(
      childResources.filter(({ type }) => type === "test:bucc:Child"),
    ).toHaveLength(8);
  });
});

function resolveOutput<T>(output: pulumi.Output<T>): Promise<T> {
  return new Promise((resolve) => {
    output.apply((value) => {
      resolve(value);
      return value;
    });
  });
}
