export type ProposalType = "sponsorship_proposal" | "idea" | "general";

export interface BeneficiaryDetails {
  beneficiary_address?: string;
  payout_token?: string;
  requested_amount?: string;
}

export interface Proposal {
  proposal_id: string;
  origin_bucc_id: string;
  author_uid: string;
  type: ProposalType;
  title: string;
  body: string;
  beneficiary_details: BeneficiaryDetails;
  tags: string[];
  s3_key: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface Vote {
  target_id: string;
  voter_uid: string;
  vote_weight: string;
  origin_bucc_id: string;
  created_at: Date;
}

export interface CreateProposalInput {
  origin_bucc_id: string;
  author_uid: string;
  type: ProposalType;
  title: string;
  body: string;
  beneficiary_details?: BeneficiaryDetails;
  tags?: string[];
  s3_key?: string | null;
}

export interface CreateVoteInput {
  target_id: string;
  voter_uid: string;
  vote_weight: string;
  origin_bucc_id: string;
}

/**
 * Quadratic voting tally for a proposal. A vote with weight `w` costs `w^2`
 * credits; the proposal's support is `(sum sqrt(w))^2` over all votes.
 */
export interface VoteTally {
  vote_count: number;
  /** Linear sum of weights. */
  total_weight: string;
  /** Sum of squared weights — total credits spent. */
  total_credits: string;
  /** Quadratic support: (sum of sqrt(weight))^2. */
  quadratic_support: string;
}
