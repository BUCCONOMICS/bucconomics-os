import {
  FileMigrationProvider,
  Kysely,
  Migrator,
  PostgresDialect,
} from "kysely";
import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Pool, type PoolConfig } from "pg";
import type { Database } from "../schema/database.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

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
    provider: new FileMigrationProvider({
      fs,
      path,
      migrationFolder: __dirname,
    }),
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
