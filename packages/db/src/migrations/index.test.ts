import { describe, expect, it } from "@jest/globals";
import { createMigrationProvider } from "./index.js";

describe("createMigrationProvider", () => {
  it("registers all four migration names", async () => {
    const provider = createMigrationProvider();
    const migrations = await provider.getMigrations();

    expect(Object.keys(migrations).sort()).toEqual([
      "20260416000000_create_proposals",
      "20260416100000_create_votes",
      "20260417000000_create_users",
      "20260418000000_add_uid_mint",
    ]);
  });
});
