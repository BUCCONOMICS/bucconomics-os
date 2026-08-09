import {
  jest,
  describe,
  beforeAll,
  afterAll,
  beforeEach,
  it,
  expect,
} from "@jest/globals";
import { PostgresProposalStore } from "../repository/PostgresProposalStore.js";
import { DuplicateVoteError } from "../errors/index.js";
import { setupTestDb, type TestDb } from "./helpers.js";

jest.setTimeout(120_000);

describe("PostgresProposalStore", () => {
  let testDb: TestDb;

  beforeAll(async () => {
    testDb = await setupTestDb();
  });

  afterAll(async () => {
    await testDb.teardown();
  });

  beforeEach(async () => {
    await testDb.reset();
  });

  const makeProposalInput = () => ({
    origin_bucc_id: "11111111-1111-1111-1111-111111111111",
    author_uid: "uid-author",
    type: "idea" as const,
    title: "Community garden",
    body: "We should build a community garden.",
  });

  it("creates and retrieves a proposal", async () => {
    const store = new PostgresProposalStore(testDb.db);
    const input = makeProposalInput();

    const proposal = await store.createProposal(input);

    expect(proposal.title).toBe(input.title);
    expect(proposal.body).toBe(input.body);
    expect(proposal.author_uid).toBe(input.author_uid);
    expect(proposal.origin_bucc_id).toBe(input.origin_bucc_id);
    expect(proposal.type).toBe("idea");
    expect(proposal.tags).toEqual([]);
    expect(proposal.beneficiary_details).toEqual({});
    expect(proposal.s3_key).toBeNull();

    const retrieved = await store.getProposal(proposal.proposal_id);
    expect(retrieved).toEqual(proposal);
  });

  it("lists proposals by origin_bucc_id", async () => {
    const store = new PostgresProposalStore(testDb.db);
    const proposalA = await store.createProposal(makeProposalInput());
    await store.createProposal({
      ...makeProposalInput(),
      origin_bucc_id: "22222222-2222-2222-2222-222222222222",
    });

    const results = await store.listProposalsByBucc(
      "11111111-1111-1111-1111-111111111111",
    );
    expect(results).toHaveLength(1);
    expect(results[0]?.proposal_id).toBe(proposalA.proposal_id);
  });

  it("creates and retrieves a vote", async () => {
    const store = new PostgresProposalStore(testDb.db);
    const proposal = await store.createProposal(makeProposalInput());

    const vote = await store.createVote({
      target_id: proposal.proposal_id,
      voter_uid: "uid-voter",
      vote_weight: "9",
      origin_bucc_id: proposal.origin_bucc_id,
    });

    expect(vote.target_id).toBe(proposal.proposal_id);
    expect(vote.voter_uid).toBe("uid-voter");
    expect(vote.vote_weight).toBe("9");

    const retrieved = await store.getVote(proposal.proposal_id, "uid-voter");
    expect(retrieved).toEqual(vote);
  });

  it("rejects a double vote at the database level and leaves the original vote unchanged", async () => {
    const store = new PostgresProposalStore(testDb.db);
    const proposal = await store.createProposal(makeProposalInput());

    await store.createVote({
      target_id: proposal.proposal_id,
      voter_uid: "uid-voter",
      vote_weight: "9",
      origin_bucc_id: proposal.origin_bucc_id,
    });

    await expect(
      store.createVote({
        target_id: proposal.proposal_id,
        voter_uid: "uid-voter",
        vote_weight: "16",
        origin_bucc_id: proposal.origin_bucc_id,
      }),
    ).rejects.toThrow(DuplicateVoteError);

    const original = await store.getVote(proposal.proposal_id, "uid-voter");
    expect(original?.vote_weight).toBe("9");
  });

  it("lists votes by proposal", async () => {
    const store = new PostgresProposalStore(testDb.db);
    const proposal = await store.createProposal(makeProposalInput());

    await store.createVote({
      target_id: proposal.proposal_id,
      voter_uid: "uid-voter-1",
      vote_weight: "1",
      origin_bucc_id: proposal.origin_bucc_id,
    });
    await store.createVote({
      target_id: proposal.proposal_id,
      voter_uid: "uid-voter-2",
      vote_weight: "4",
      origin_bucc_id: proposal.origin_bucc_id,
    });

    const votes = await store.listVotesByProposal(proposal.proposal_id);
    expect(votes).toHaveLength(2);
    expect(votes.map((v) => v.voter_uid).sort()).toEqual([
      "uid-voter-1",
      "uid-voter-2",
    ]);
  });

  it("lists votes by voter across proposals", async () => {
    const store = new PostgresProposalStore(testDb.db);
    const proposalA = await store.createProposal(makeProposalInput());
    const proposalB = await store.createProposal(makeProposalInput());

    await store.createVote({
      target_id: proposalA.proposal_id,
      voter_uid: "uid-voter",
      vote_weight: "9",
      origin_bucc_id: proposalA.origin_bucc_id,
    });
    await store.createVote({
      target_id: proposalB.proposal_id,
      voter_uid: "uid-voter",
      vote_weight: "4",
      origin_bucc_id: proposalB.origin_bucc_id,
    });
    await store.createVote({
      target_id: proposalA.proposal_id,
      voter_uid: "uid-other",
      vote_weight: "1",
      origin_bucc_id: proposalA.origin_bucc_id,
    });

    const votes = await store.getVotesByVoter("uid-voter");
    expect(votes).toHaveLength(2);
    expect(votes.map((v) => v.target_id).sort()).toEqual(
      [proposalA.proposal_id, proposalB.proposal_id].sort(),
    );
  });
});
