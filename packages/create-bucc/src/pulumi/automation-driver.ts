import {
  LocalWorkspace,
  type LocalWorkspaceOptions,
  type OutputMap,
  type PulumiFn,
  type Stack,
} from "@pulumi/pulumi/automation/index.js";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

import { createBootstrapProgram, createFoundationProgram } from "./programs.js";
import type { AutomationDriver, AutomationUpInput } from "./types.js";

export function createAutomationDriver(): AutomationDriver {
  return {
    async upBootstrap(input) {
      const backendUrl = pathToFileURL(join(input.workDir, "state")).href;
      const stack = await LocalWorkspace.createStack(
        inlineArgs(input, createBootstrapProgram(input.config)),
        workspaceOptions(input, backendUrl),
      );
      return runUp(stack);
    },
    async upFoundation(input) {
      const stack = await LocalWorkspace.selectStack(
        inlineArgs(input, createFoundationProgram(input.config)),
        workspaceOptions(input, input.backendUrl),
      );
      return runUp(stack);
    },
  };
}

function inlineArgs(input: AutomationUpInput, program: PulumiFn) {
  return {
    projectName: input.projectName,
    stackName: input.stackName,
    program,
  };
}

function workspaceOptions(
  input: AutomationUpInput,
  backendUrl: string,
): LocalWorkspaceOptions {
  return {
    workDir: input.workDir,
    pulumiCommand: input.command,
    secretsProvider: "passphrase",
    projectSettings: {
      name: input.projectName,
      runtime: "nodejs",
      backend: { url: backendUrl },
    },
    envVars: {
      PULUMI_BACKEND_URL: backendUrl,
      PULUMI_CONFIG_PASSPHRASE: input.passphrase,
      PULUMI_SKIP_UPDATE_CHECK: "true",
    },
  };
}

async function runUp(stack: Stack): Promise<Record<string, unknown>> {
  const result = await stack.up({
    color: "never",
    suppressOutputs: true,
    showSecrets: false,
  });
  return outputValues(result.outputs);
}

function outputValues(outputs: OutputMap): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(outputs).map(([key, output]) => [
      key,
      output.value as unknown,
    ]),
  );
}
