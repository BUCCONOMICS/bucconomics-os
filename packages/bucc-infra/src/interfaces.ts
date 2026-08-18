import * as pulumi from "@pulumi/pulumi";

import type { BuccProviderConfig, BuccRpcConfig } from "./config/schema.js";

export type BuccOpaqueReference = pulumi.Output<string>;

export interface BuccCommonInputs {
  readonly name: string;
  readonly region: string;
}

export type BuccStateBackendInputs = BuccCommonInputs;

export interface BuccNetworkInputs extends BuccCommonInputs {
  readonly stateBackend: BuccStateBackendOutputs;
}

export interface BuccKeyringInputs extends BuccCommonInputs {
  readonly network: BuccNetworkOutputs;
}

export interface BuccStorageInputs extends BuccCommonInputs {
  readonly keyring: BuccKeyringOutputs;
}

export interface BuccDatabaseInputs extends BuccCommonInputs {
  readonly network: BuccNetworkOutputs;
  readonly keyring: BuccKeyringOutputs;
  readonly migrationSource: typeof BUCC_DATABASE_MIGRATION_SOURCE;
}

export interface BuccApiInputs extends BuccCommonInputs {
  readonly mode: "practice" | "live";
  readonly network: BuccNetworkOutputs;
  readonly database: BuccDatabaseOutputs;
  readonly storage: BuccStorageOutputs;
  readonly kycProvider: BuccProviderConfig;
  readonly financialProvider: BuccProviderConfig;
  readonly rpc: BuccRpcConfig;
}

export interface BuccReviewAgentInputs extends BuccCommonInputs {
  readonly database: BuccDatabaseOutputs;
  readonly storage: BuccStorageOutputs;
  readonly cadenceHours: number;
}

export interface BuccMonitoringInputs extends BuccCommonInputs {
  readonly api: BuccApiOutputs;
  readonly database: BuccDatabaseOutputs;
  readonly contactEmail: string;
  readonly budgetThreshold: number;
}

export interface BuccStateBackendOutputs {
  readonly backendRef: BuccOpaqueReference;
  readonly passphraseSecretRef: BuccOpaqueReference;
}

export interface BuccNetworkOutputs {
  readonly networkRef: BuccOpaqueReference;
  readonly privateSubnetRefs: pulumi.Output<readonly string[]>;
  readonly apiSecurityGroupRef: BuccOpaqueReference;
}

export interface BuccKeyringOutputs {
  readonly atRestKeyRef: BuccOpaqueReference;
  readonly fieldLevelKeyRef: BuccOpaqueReference;
}

export interface BuccDatabaseOutputs {
  readonly databaseRef: BuccOpaqueReference;
  readonly connectionSecretRef: BuccOpaqueReference;
  readonly migrationRef: BuccOpaqueReference;
}

export interface BuccStorageOutputs {
  readonly reportsStorageRef: BuccOpaqueReference;
  readonly exportsStorageRef: BuccOpaqueReference;
}

export interface BuccApiOutputs {
  readonly endpointRef: BuccOpaqueReference;
  readonly serviceIdentityRef: BuccOpaqueReference;
}

export interface BuccReviewAgentOutputs {
  readonly scheduleRef: BuccOpaqueReference;
  readonly reportDestinationRef: BuccOpaqueReference;
  readonly notificationRef: BuccOpaqueReference;
}

export interface BuccMonitoringOutputs {
  readonly dashboardRef: BuccOpaqueReference;
  readonly budgetAlarmRef: BuccOpaqueReference;
  readonly notificationRef: BuccOpaqueReference;
}

export const BUCC_DATABASE_MIGRATION_SOURCE = "@repo/db/migrations";
export const BUCC_STATE_BACKEND_TYPE = "bucconomics:bucc:StateBackend";
export const BUCC_NETWORK_TYPE = "bucconomics:bucc:Network";
export const BUCC_KEYRING_TYPE = "bucconomics:bucc:Keyring";
export const BUCC_DATABASE_TYPE = "bucconomics:bucc:Database";
export const BUCC_STORAGE_TYPE = "bucconomics:bucc:Storage";
export const BUCC_API_TYPE = "bucconomics:bucc:Api";
export const BUCC_REVIEW_AGENT_TYPE = "bucconomics:bucc:ReviewAgent";
export const BUCC_MONITORING_TYPE = "bucconomics:bucc:Monitoring";

export abstract class BuccStateBackend
  extends pulumi.ComponentResource
  implements BuccStateBackendOutputs
{
  abstract readonly backendRef: BuccOpaqueReference;
  abstract readonly passphraseSecretRef: BuccOpaqueReference;

  protected constructor(
    name: string,
    inputs: BuccStateBackendInputs,
    opts?: pulumi.ComponentResourceOptions,
  ) {
    super(BUCC_STATE_BACKEND_TYPE, name, inputs, opts);
  }
}

export abstract class BuccNetwork
  extends pulumi.ComponentResource
  implements BuccNetworkOutputs
{
  abstract readonly networkRef: BuccOpaqueReference;
  abstract readonly privateSubnetRefs: pulumi.Output<readonly string[]>;
  abstract readonly apiSecurityGroupRef: BuccOpaqueReference;

  protected constructor(
    name: string,
    inputs: BuccNetworkInputs,
    opts?: pulumi.ComponentResourceOptions,
  ) {
    super(BUCC_NETWORK_TYPE, name, inputs, opts);
  }
}

export abstract class BuccKeyring
  extends pulumi.ComponentResource
  implements BuccKeyringOutputs
{
  abstract readonly atRestKeyRef: BuccOpaqueReference;
  abstract readonly fieldLevelKeyRef: BuccOpaqueReference;

  protected constructor(
    name: string,
    inputs: BuccKeyringInputs,
    opts?: pulumi.ComponentResourceOptions,
  ) {
    super(BUCC_KEYRING_TYPE, name, inputs, opts);
  }
}

export abstract class BuccDatabase
  extends pulumi.ComponentResource
  implements BuccDatabaseOutputs
{
  abstract readonly databaseRef: BuccOpaqueReference;
  abstract readonly connectionSecretRef: BuccOpaqueReference;
  abstract readonly migrationRef: BuccOpaqueReference;

  protected constructor(
    name: string,
    inputs: BuccDatabaseInputs,
    opts?: pulumi.ComponentResourceOptions,
  ) {
    super(BUCC_DATABASE_TYPE, name, inputs, opts);
  }
}

export abstract class BuccStorage
  extends pulumi.ComponentResource
  implements BuccStorageOutputs
{
  abstract readonly reportsStorageRef: BuccOpaqueReference;
  abstract readonly exportsStorageRef: BuccOpaqueReference;

  protected constructor(
    name: string,
    inputs: BuccStorageInputs,
    opts?: pulumi.ComponentResourceOptions,
  ) {
    super(BUCC_STORAGE_TYPE, name, inputs, opts);
  }
}

export abstract class BuccApi
  extends pulumi.ComponentResource
  implements BuccApiOutputs
{
  abstract readonly endpointRef: BuccOpaqueReference;
  abstract readonly serviceIdentityRef: BuccOpaqueReference;

  protected constructor(
    name: string,
    inputs: BuccApiInputs,
    opts?: pulumi.ComponentResourceOptions,
  ) {
    super(BUCC_API_TYPE, name, inputs, opts);
  }
}

export abstract class BuccReviewAgent
  extends pulumi.ComponentResource
  implements BuccReviewAgentOutputs
{
  abstract readonly scheduleRef: BuccOpaqueReference;
  abstract readonly reportDestinationRef: BuccOpaqueReference;
  abstract readonly notificationRef: BuccOpaqueReference;

  protected constructor(
    name: string,
    inputs: BuccReviewAgentInputs,
    opts?: pulumi.ComponentResourceOptions,
  ) {
    super(BUCC_REVIEW_AGENT_TYPE, name, inputs, opts);
  }
}

export abstract class BuccMonitoring
  extends pulumi.ComponentResource
  implements BuccMonitoringOutputs
{
  abstract readonly dashboardRef: BuccOpaqueReference;
  abstract readonly budgetAlarmRef: BuccOpaqueReference;
  abstract readonly notificationRef: BuccOpaqueReference;

  protected constructor(
    name: string,
    inputs: BuccMonitoringInputs,
    opts?: pulumi.ComponentResourceOptions,
  ) {
    super(BUCC_MONITORING_TYPE, name, inputs, opts);
  }
}

export type BuccComponentFactory<TInputs, TComponent> = (
  name: string,
  inputs: TInputs,
  opts?: pulumi.ComponentResourceOptions,
) => TComponent;

export interface BuccImplementationSet {
  readonly stateBackend: BuccComponentFactory<
    BuccStateBackendInputs,
    BuccStateBackend
  >;
  readonly network: BuccComponentFactory<BuccNetworkInputs, BuccNetwork>;
  readonly keyring: BuccComponentFactory<BuccKeyringInputs, BuccKeyring>;
  readonly database: BuccComponentFactory<BuccDatabaseInputs, BuccDatabase>;
  readonly storage: BuccComponentFactory<BuccStorageInputs, BuccStorage>;
  readonly api: BuccComponentFactory<BuccApiInputs, BuccApi>;
  readonly reviewAgent: BuccComponentFactory<
    BuccReviewAgentInputs,
    BuccReviewAgent
  >;
  readonly monitoring: BuccComponentFactory<
    BuccMonitoringInputs,
    BuccMonitoring
  >;
}

export interface BuccStackResources {
  readonly stateBackend: BuccStateBackend;
  readonly network: BuccNetwork;
  readonly keyring: BuccKeyring;
  readonly database: BuccDatabase;
  readonly storage: BuccStorage;
  readonly api: BuccApi;
  readonly reviewAgent: BuccReviewAgent;
  readonly monitoring: BuccMonitoring;
}
