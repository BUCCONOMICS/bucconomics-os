import type { BuccFoundationImplementationSet } from "@repo/bucc-infra";

import {
  parseAwsFoundationConfig,
  type AwsFoundationConfigInput,
} from "./config/schema.js";
import { AwsBuccDatabase } from "./database.js";
import { AwsBuccKeyring } from "./keyring.js";
import { AwsBuccNetwork } from "./network.js";
import { getProvider } from "./provider.js";
import { mergeProvider } from "./shared.js";
import { AwsBuccStateBackend } from "./state-backend.js";
import { AwsBuccStorage } from "./storage.js";

export interface AwsFoundationInputs {
  readonly config: AwsFoundationConfigInput;
}

export function createAwsFoundationImplementations({
  config: input,
}: AwsFoundationInputs): BuccFoundationImplementationSet {
  const config = parseAwsFoundationConfig(input);
  const componentOptions = (
    opts: Parameters<BuccFoundationImplementationSet["network"]>[2],
  ) =>
    mergeProvider(getProvider(config.region, config.expectedAccountId), opts);

  return {
    stateBackend: (name, inputs, opts) =>
      new AwsBuccStateBackend(name, inputs, componentOptions(opts)),
    network: (name, inputs, opts) =>
      new AwsBuccNetwork(name, inputs, config, componentOptions(opts)),
    keyring: (name, inputs, opts) =>
      new AwsBuccKeyring(name, inputs, config, componentOptions(opts)),
    storage: (name, inputs, opts) =>
      new AwsBuccStorage(name, inputs, componentOptions(opts)),
    database: (name, inputs, opts) =>
      new AwsBuccDatabase(name, inputs, config, componentOptions(opts)),
  };
}
