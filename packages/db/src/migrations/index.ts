import {
  Kysely,
  Migrator,
  PostgresDialect,
  type Migration,
  type MigrationProvider,
} from "kysely";
import { Pool, type PoolConfig } from "pg";
import type { Database } from "../schema/database.js";
import * as migration20260416000000CreateProposals from "./20260416000000_create_proposals.js";
import * as migration20260416100000CreateVotes from "./20260416100000_create_votes.js";
import * as migration20260417000000CreateUsers from "./20260417000000_create_users.js";
import * as migration20260418000000AddUidMint from "./20260418000000_add_uid_mint.js";

const migrations: Readonly<Record<string, Migration>> = {
  "20260416000000_create_proposals": migration20260416000000CreateProposals,
  "20260416100000_create_votes": migration20260416100000CreateVotes,
  "20260417000000_create_users": migration20260417000000CreateUsers,
  "20260418000000_add_uid_mint": migration20260418000000AddUidMint,
};

export function createMigrationProvider(): MigrationProvider {
  return {
    async getMigrations() {
      return migrations;
    },
  };
}

async function runMigrations(
  poolConfig: PoolConfig,
  direction: "up" | "down",
): Promise<void> {
  const pool = new Pool(poolConfig);
  const db = new Kysely<Database>({
    dialect: new PostgresDialect({ pool }),
  });

  const migrator = new Migrator({
    db,
    provider: createMigrationProvider(),
  });

  const { error, results } =
    direction === "up"
      ? await migrator.migrateToLatest()
      : await migrator.migrateDown();

  results?.forEach((result) => {
    if (result.status === "Success") {
      console.log(
        `Migration ${result.migrationName} ${direction === "up" ? "executed" : "rolled back"} successfully`,
      );
    } else if (result.status === "Error") {
      console.error(`Migration ${result.migrationName} ${direction} failed`);
    }
  });

  await db.destroy();

  if (error) {
    throw error;
  }
}

export async function migrateToLatest(poolConfig: PoolConfig): Promise<void> {
  await runMigrations(poolConfig, "up");
}

export async function migrateDown(poolConfig: PoolConfig): Promise<void> {
  await runMigrations(poolConfig, "down");
}
