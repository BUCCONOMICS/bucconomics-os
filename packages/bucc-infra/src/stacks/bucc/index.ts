import type * as pulumi from "@pulumi/pulumi";

import type { BuccConfig } from "../../config/schema.js";
import {
  BUCC_DATABASE_MIGRATION_SOURCE,
  type BuccImplementationSet,
  type BuccStackResources,
} from "../../interfaces.js";

export interface BuccStackInputs {
  readonly config: BuccConfig;
  readonly implementations: BuccImplementationSet;
  readonly opts?: pulumi.ComponentResourceOptions;
}

export function buildBuccStack({
  config,
  implementations,
  opts,
}: BuccStackInputs): BuccStackResources {
  const commonInputs = { name: config.name, region: config.region };
  const stateBackend = implementations.stateBackend(
    `${config.name}-state-backend`,
    commonInputs,
    opts,
  );
  const network = implementations.network(
    `${config.name}-network`,
    {
      ...commonInputs,
      stateBackend,
    },
    opts,
  );
  const keyring = implementations.keyring(
    `${config.name}-keyring`,
    {
      ...commonInputs,
      network,
    },
    opts,
  );
  const storage = implementations.storage(
    `${config.name}-storage`,
    {
      ...commonInputs,
      keyring,
    },
    opts,
  );
  const database = implementations.database(
    `${config.name}-database`,
    {
      ...commonInputs,
      network,
      keyring,
      migrationSource: BUCC_DATABASE_MIGRATION_SOURCE,
    },
    opts,
  );
  const api = implementations.api(
    `${config.name}-api`,
    {
      ...commonInputs,
      mode: config.mode,
      network,
      database,
      storage,
      kycProvider: config.kycProvider,
      financialProvider: config.financialProvider,
      rpc: config.rpc,
    },
    opts,
  );
  const reviewAgent = implementations.reviewAgent(
    `${config.name}-review-agent`,
    {
      ...commonInputs,
      database,
      storage,
      cadenceHours: config.reviewCadenceHours,
    },
    opts,
  );
  const monitoring = implementations.monitoring(
    `${config.name}-monitoring`,
    {
      ...commonInputs,
      api,
      database,
      contactEmail: config.contactEmail,
      budgetThreshold: config.budgetThreshold,
    },
    opts,
  );

  return {
    stateBackend,
    network,
    keyring,
    database,
    storage,
    api,
    reviewAgent,
    monitoring,
  };
}
