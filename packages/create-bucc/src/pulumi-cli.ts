import { PulumiCommand } from "@pulumi/pulumi/automation/index.js";
import { SemVer } from "semver";

import type { PulumiCliPort } from "./types.js";

const PULUMI_VERSION = new SemVer("3.258.0");

export function assertSupportedNodeVersion(
  version = process.versions.node,
): void {
  const major = Number(version.split(".")[0]);
  if (!Number.isInteger(major) || major < 22) {
    throw new Error("create-bucc requires Node.js 22 or newer");
  }
}

export function createPulumiCliPort(): PulumiCliPort {
  return {
    async ensureSupported(): Promise<PulumiCommand> {
      assertSupportedNodeVersion();
      try {
        const existing = await PulumiCommand.get({ version: PULUMI_VERSION });
        if (existing) return existing;
      } catch {
        // Install the pinned CLI below when PATH has no compatible binary.
      }
      return PulumiCommand.install({ version: PULUMI_VERSION });
    },
  };
}
