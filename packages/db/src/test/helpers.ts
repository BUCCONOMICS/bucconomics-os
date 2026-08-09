import type { StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import { PostgreSqlContainer } from "@testcontainers/postgresql";
import { Kysely, PostgresDialect } from "kysely";
import { Pool } from "pg";
import type { PoolConfig } from "pg";
import type { Database } from "../schema/database.js";
import { migrateToLatest } from "../migrations/index.js";

export interface TestDb {
  db: Kysely<Database>;
  pool: Pool;
  container: StartedPostgreSqlContainer;
  teardown: () => Promise<void>;
  reset: () => Promise<void>;
}

export async function setupTestDb(): Promise<TestDb> {
  const container = await new PostgreSqlContainer("postgres:16-alpine")
    .withDatabase("test")
    .withUsername("test")
    .withPassword("test")
    .start();

  const poolConfig: PoolConfig = {
    host: container.getHost(),
    port: container.getPort(),
    database: container.getDatabase(),
    user: container.getUsername(),
    password: container.getPassword(),
  };

  await migrateToLatest(poolConfig);

  const pool = new Pool(poolConfig);

  const db = new Kysely<Database>({
    dialect: new PostgresDialect({ pool }),
  });

  async function reset(): Promise<void> {
    await db.deleteFrom("votes").execute();
    await db.deleteFrom("proposals").execute();
    await db.deleteFrom("users").execute();
  }

  async function teardown(): Promise<void> {
    await db.destroy();
    await container.stop();
  }

  return {
    db,
    pool,
    container,
    teardown,
    reset,
  };
}
