import type { Generated } from "kysely";

export type ProposalType = "sponsorship_proposal" | "idea" | "general";

export interface ProposalTable {
  proposal_id: Generated<string>;
  origin_bucc_id: string;
  author_uid: string;
  type: ProposalType;
  title: string;
  body: string;
  beneficiary_details: unknown;
  tags: string[];
  s3_key: string | null;
  created_at: Generated<Date>;
  updated_at: Generated<Date>;
}

export interface VoteTable {
  target_id: string;
  voter_uid: string;
  vote_weight: string;
  origin_bucc_id: string;
  created_at: Generated<Date>;
}

export type KycStatus = "pending" | "passed" | "failed";

export type RiskBand = "LOW" | "MEDIUM" | "HIGH" | "PENDING";

export interface UserTable {
  user_uid: string;
  kyc_status: KycStatus;
  risk_band: RiskBand;
  cooling_off_ends_at: Date | null;
  created_at: Generated<Date>;
  updated_at: Generated<Date>;
}
