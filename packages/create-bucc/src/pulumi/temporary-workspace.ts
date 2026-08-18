import { chmod, mkdtemp, mkdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import type { TemporaryWorkspace, TemporaryWorkspaceFactory } from "./types.js";

export function createTemporaryWorkspaceFactory(): TemporaryWorkspaceFactory {
  return {
    async create(): Promise<TemporaryWorkspace> {
      const path = await mkdtemp(join(tmpdir(), "create-bucc-"));
      await chmod(path, 0o700);
      const localStatePath = join(path, "state");
      await mkdir(localStatePath, { mode: 0o700 });
      return {
        path,
        localStatePath,
        cleanup: () => rm(path, { recursive: true, force: true }),
      };
    },
  };
}
