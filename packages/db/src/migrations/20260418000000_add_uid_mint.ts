import { sql, type Kysely } from "kysely";

export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`
    ALTER TABLE users
      ADD COLUMN minted_uid_token_id NUMERIC(78, 0),
      ADD COLUMN minted_at TIMESTAMPTZ;
  `.execute(db);
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await sql`
    ALTER TABLE users
      DROP COLUMN IF EXISTS minted_at,
      DROP COLUMN IF EXISTS minted_uid_token_id;
  `.execute(db);
}
