#!/usr/bin/env node

import { createAwsIdentityPort } from "../aws.js";
import {
  createDeferredRuntimeCompleter,
  createUnavailableHealthChecker,
} from "../boundaries.js";
import { createInquirerPrompt } from "../inquirer-adapter.js";
import { runInstaller } from "../orchestrator.js";
import {
  createAutomationDriver,
  createBackendSecretReader,
  createFoundationProvisioner,
  createMigrationDriver,
  createProcessRunner,
  createTemporaryWorkspaceFactory,
} from "../pulumi/index.js";
import { createPulumiCliPort } from "../pulumi-cli.js";
import { createConsolePresenter } from "../presenter.js";
import { createProviderSecretStore } from "../secrets.js";

async function main(): Promise<void> {
  const prompt = createInquirerPrompt();
  await runInstaller({
    pulumi: createPulumiCliPort(),
    identity: createAwsIdentityPort(),
    prompt,
    secrets: createProviderSecretStore(),
    provisioner: createFoundationProvisioner({
      automation: createAutomationDriver(),
      migration: createMigrationDriver(createProcessRunner()),
      secretReader: createBackendSecretReader(),
      workspaces: createTemporaryWorkspaceFactory(),
    }),
    runtime: createDeferredRuntimeCompleter(),
    health: createUnavailableHealthChecker(),
    presenter: createConsolePresenter(prompt),
  });
}

void main().catch((error: unknown) => {
  console.error(
    error instanceof Error ? error.message : "create-bucc installation failed",
  );
  process.exitCode = 1;
});
