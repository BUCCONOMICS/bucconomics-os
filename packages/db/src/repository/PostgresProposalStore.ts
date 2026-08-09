import { Kysely, PostgresDialect } from "kysely";
import type { Pool } from "pg";
import type {
  BeneficiaryDetails,
  CreateProposalInput,
  CreateVoteInput,
  IProposalStore,
  Proposal,
  Vote,
} from "@repo/interfaces";
import type { Selectable } from "kysely";
import type { Database } from "../schema/database.js";
import type { ProposalTable, VoteTable } from "../schema/tables.js";
import { DuplicateVoteError } from "../errors/index.js";

export class PostgresProposalStore implements IProposalStore {
  constructor(private readonly db: Kysely<Database>) {}

  static fromPool(pool: Pool): PostgresProposalStore {
    const db = new Kysely<Database>({
      dialect: new PostgresDialect({ pool }),
    });
    return new PostgresProposalStore(db);
  }

  async createProposal(input: CreateProposalInput): Promise<Proposal> {
    const row = await this.db
      .insertInto("proposals")
      .values({
        origin_bucc_id: input.origin_bucc_id,
        author_uid: input.author_uid,
        type: input.type,
        title: input.title,
        body: input.body,
        beneficiary_details: input.beneficiary_details ?? {},
        tags: input.tags ?? [],
        s3_key: input.s3_key ?? null,
      })
      .returningAll()
      .executeTakeFirstOrThrow();

    return mapProposalRow(row);
  }

  async getProposal(proposal_id: string): Promise<Proposal | null> {
    const row = await this.db
      .selectFrom("proposals")
      .selectAll()
      .where("proposal_id", "=", proposal_id)
      .executeTakeFirst();
    return row ? mapProposalRow(row) : null;
  }

  async listProposalsByBucc(origin_bucc_id: string): Promise<Proposal[]> {
    const rows = await this.db
      .selectFrom("proposals")
      .selectAll()
      .where("origin_bucc_id", "=", origin_bucc_id)
      .orderBy("created_at", "desc")
      .execute();
    return rows.map(mapProposalRow);
  }

  async createVote(input: CreateVoteInput): Promise<Vote> {
    try {
      const row = await this.db
        .insertInto("votes")
        .values({
          target_id: input.target_id,
          voter_uid: input.voter_uid,
          vote_weight: input.vote_weight,
          origin_bucc_id: input.origin_bucc_id,
        })
        .returningAll()
        .executeTakeFirstOrThrow();
      return mapVoteRow(row);
    } catch (error) {
      if (isPostgresUniqueViolation(error)) {
        throw new DuplicateVoteError(input.target_id, input.voter_uid);
      }
      throw error;
    }
  }

  async getVote(target_id: string, voter_uid: string): Promise<Vote | null> {
    const row = await this.db
      .selectFrom("votes")
      .selectAll()
      .where("target_id", "=", target_id)
      .where("voter_uid", "=", voter_uid)
      .executeTakeFirst();
    return row ? mapVoteRow(row) : null;
  }

  async listVotesByProposal(target_id: string): Promise<Vote[]> {
    const rows = await this.db
      .selectFrom("votes")
      .selectAll()
      .where("target_id", "=", target_id)
      .orderBy("created_at", "desc")
      .execute();
    return rows.map(mapVoteRow);
  }

  async getVotesByVoter(voter_uid: string): Promise<Vote[]> {
    const rows = await this.db
      .selectFrom("votes")
      .selectAll()
      .where("voter_uid", "=", voter_uid)
      .orderBy("created_at", "desc")
      .execute();
    return rows.map(mapVoteRow);
  }
}

function mapProposalRow(row: Selectable<ProposalTable>): Proposal {
  return {
    proposal_id: row.proposal_id,
    origin_bucc_id: row.origin_bucc_id,
    author_uid: row.author_uid,
    type: row.type,
    title: row.title,
    body: row.body,
    beneficiary_details: row.beneficiary_details as BeneficiaryDetails,
    tags: row.tags,
    s3_key: row.s3_key,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function mapVoteRow(row: Selectable<VoteTable>): Vote {
  return {
    target_id: row.target_id,
    voter_uid: row.voter_uid,
    vote_weight: row.vote_weight,
    origin_bucc_id: row.origin_bucc_id,
    created_at: row.created_at,
  };
}

function isPostgresUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "23505"
  );
}
