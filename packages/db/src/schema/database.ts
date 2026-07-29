import type { ProposalTable, VoteTable } from "./tables.js";

export interface Database {
  proposals: ProposalTable;
  votes: VoteTable;
}
