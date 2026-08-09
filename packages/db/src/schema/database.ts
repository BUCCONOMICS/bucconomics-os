import type { ProposalTable, UserTable, VoteTable } from "./tables.js";

export interface Database {
  proposals: ProposalTable;
  votes: VoteTable;
  users: UserTable;
}
