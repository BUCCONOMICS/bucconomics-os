import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";

// ==========================================
// TABLE 1: Community Proposals
// ==========================================
const proposalsTable = new aws.dynamodb.Table("CommunityProposals", {
  attributes: [
    { name: "id", type: "S" }, // The unique UUID of the proposal
    { name: "authorUid", type: "S" }, // The BUCC_UID of the creator
  ],
  hashKey: "id",
  rangeKey: "authorUid",
  billingMode: "PAY_PER_REQUEST", // On-demand pricing (costs nothing when idle)
  tags: {
    Environment: "dev",
    Project: "BUCCONOMICS-OS",
  },
});

// ==========================================
// TABLE 2: Civic Votes (Quadratic Voting)
// ==========================================
const civicVotesTable = new aws.dynamodb.Table("CivicVotes", {
  attributes: [
    { name: "proposalId", type: "S" }, // Maps to the id in CommunityProposals
    { name: "voterUid", type: "S" }, // The BUCC_UID of the voter
  ],
  // Using proposalId as Hash Key and voterUid as Range Key ensures
  // a specific user can only ever have ONE active vote record per proposal.
  hashKey: "proposalId",
  rangeKey: "voterUid",
  billingMode: "PAY_PER_REQUEST",
  tags: {
    Environment: "dev",
    Project: "BUCCONOMICS-OS",
  },
});

// ==========================================
// EXPORTS
// ==========================================
// We export these so that when the infrastructure is eventually deployed,
// Pulumi can pass these exact table names to our Node.js API as environment variables.
export const proposalsTableName = proposalsTable.name;
export const proposalsTableArn = proposalsTable.arn;
export const civicVotesTableName = civicVotesTable.name;
export const civicVotesTableArn = civicVotesTable.arn;
