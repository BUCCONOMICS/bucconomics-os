import { sql, type Kysely } from "kysely";

export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`
    CREATE TABLE votes (
      target_id UUID NOT NULL REFERENCES proposals(proposal_id) ON DELETE CASCADE,
      voter_uid TEXT NOT NULL,
      vote_weight NUMERIC(78, 0) NOT NULL,
      origin_bucc_id UUID NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (target_id, voter_uid),
      UNIQUE (target_id, voter_uid)
    );

    CREATE INDEX idx_votes_origin_bucc_id ON votes(origin_bucc_id);
    CREATE INDEX idx_votes_voter_uid ON votes(voter_uid);
  `.execute(db);
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await sql`DROP TABLE IF EXISTS votes;`.execute(db);
}
