import { sql, type Kysely } from "kysely";

export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`
    CREATE TYPE kyc_status AS ENUM ('pending', 'passed', 'failed');
    CREATE TYPE risk_band AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'PENDING');

    CREATE TABLE users (
      user_uid TEXT PRIMARY KEY,
      kyc_status kyc_status NOT NULL DEFAULT 'pending',
      risk_band risk_band NOT NULL DEFAULT 'PENDING',
      cooling_off_ends_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX idx_users_kyc_status ON users(kyc_status);
  `.execute(db);
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await sql`
    DROP TABLE IF EXISTS users;
    DROP TYPE IF EXISTS risk_band;
    DROP TYPE IF EXISTS kyc_status;
  `.execute(db);
}
