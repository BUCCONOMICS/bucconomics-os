import type {
  CreateProposalInput,
  CreateVoteInput,
  Proposal,
  Vote,
} from "./types.js";

export interface IProposalStore {
  createProposal(input: CreateProposalInput): Promise<Proposal>;
  getProposal(proposal_id: string): Promise<Proposal | null>;
  listProposalsByBucc(origin_bucc_id: string): Promise<Proposal[]>;
  createVote(input: CreateVoteInput): Promise<Vote>;
  getVote(target_id: string, voter_uid: string): Promise<Vote | null>;
  listVotesByProposal(target_id: string): Promise<Vote[]>;
  getVotesByVoter(voter_uid: string): Promise<Vote[]>;
}
