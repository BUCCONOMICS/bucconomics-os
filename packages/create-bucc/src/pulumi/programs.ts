import {
  BUCC_DATABASE_MIGRATION_SOURCE,
  type BuccStateBackendInputs,
} from "@repo/bucc-infra";
import {
  createAwsFoundationImplementations,
  type AwsFoundationConfig,
} from "@repo/bucc-infra-aws";
import type { PulumiFn } from "@pulumi/pulumi/automation/index.js";

export function createBootstrapProgram(config: AwsFoundationConfig): PulumiFn {
  return async () => {
    const implementations = createAwsFoundationImplementations({ config });
    const common: BuccStateBackendInputs = {
      name: config.name,
      region: config.region,
    };
    const stateBackend = implementations.stateBackend(
      `${config.name}-state-backend`,
      common,
    );
    return {
      backendRef: stateBackend.backendRef,
      passphraseSecretRef: stateBackend.passphraseSecretRef,
    };
  };
}

export function createFoundationProgram(config: AwsFoundationConfig): PulumiFn {
  return async () => {
    const implementations = createAwsFoundationImplementations({ config });
    const common = { name: config.name, region: config.region };
    const stateBackend = implementations.stateBackend(
      `${config.name}-state-backend`,
      common,
    );
    const network = implementations.network(`${config.name}-network`, {
      ...common,
      stateBackend,
    });
    const keyring = implementations.keyring(`${config.name}-keyring`, {
      ...common,
      network,
    });
    const storage = implementations.storage(`${config.name}-storage`, {
      ...common,
      keyring,
    });
    const database = implementations.database(`${config.name}-database`, {
      ...common,
      network,
      keyring,
      migrationSource: BUCC_DATABASE_MIGRATION_SOURCE,
    });

    return {
      backendRef: stateBackend.backendRef,
      passphraseSecretRef: stateBackend.passphraseSecretRef,
      networkRef: network.networkRef,
      atRestKeyRef: keyring.atRestKeyRef,
      fieldLevelKeyRef: keyring.fieldLevelKeyRef,
      reportsStorageRef: storage.reportsStorageRef,
      exportsStorageRef: storage.exportsStorageRef,
      databaseRef: database.databaseRef,
      connectionSecretRef: database.connectionSecretRef,
      migrationRef: database.migrationRef,
    };
  };
}
