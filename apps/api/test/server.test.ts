import {
  jest,
  beforeAll,
  afterAll,
  beforeEach,
  it,
  expect,
} from "@jest/globals";
import type { StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import { PostgreSqlContainer } from "@testcontainers/postgresql";
import type { FastifyInstance } from "fastify";
import { Pool, type PoolConfig } from "pg";
import {
  migrateToLatest,
  PostgresProposalStore,
  PostgresUserStore,
} from "@repo/db";
import { createServer } from "../src/server.js";
import { MintUidError, type UidMinter } from "../src/mint.js";

jest.setTimeout(120_000);

const fakeMinter: UidMinter = {
  mintUid: jest.fn(async () => ({ tokenId: "42" })),
};

describe("proposal/vote API", () => {
  let container: StartedPostgreSqlContainer;
  let pool: Pool;
  let app: FastifyInstance;

  beforeAll(async () => {
    container = await new PostgreSqlContainer("postgres:16-alpine")
      .withDatabase("test")
      .withUsername("test")
      .withPassword("test")
      .start();

    const poolConfig: PoolConfig = {
      host: container.getHost(),
      port: container.getPort(),
      database: container.getDatabase(),
      user: container.getUsername(),
      password: container.getPassword(),
    };

    await migrateToLatest(poolConfig);

    pool = new Pool(poolConfig);
    app = await createServer({
      store: PostgresProposalStore.fromPool(pool),
      userStore: PostgresUserStore.fromPool(pool),
      minter: fakeMinter,
    });
  });

  afterAll(async () => {
    await app.close();
    await pool.end();
    await container.stop();
  });

  beforeEach(async () => {
    await pool.query("DELETE FROM votes");
    await pool.query("DELETE FROM proposals");
    await pool.query("DELETE FROM users");
  });

  const buccId = "11111111-1111-1111-1111-111111111111";
  const validProposal = {
    origin_bucc_id: buccId,
    author_uid: "uid-author",
    type: "sponsorship_proposal",
    title: "Community solar project",
    body: "We want to fund a community solar installation.",
    beneficiary_details: {
      beneficiary_address: "0xRecipient",
      payout_token: "USDC",
      requested_amount: "1000",
    },
    tags: ["energy"],
  };

  it("GET /health returns ok", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/health",
    });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ status: "ok" });
  });

  it("creates and retrieves a proposal", async () => {
    const createResponse = await app.inject({
      method: "POST",
      url: "/proposals",
      payload: validProposal,
    });
    expect(createResponse.statusCode).toBe(201);
    const created = createResponse.json();
    expect(created.title).toBe(validProposal.title);

    const getResponse = await app.inject({
      method: "GET",
      url: `/proposals/${created.proposal_id}`,
    });
    expect(getResponse.statusCode).toBe(200);
    expect(getResponse.json()).toEqual(created);
  });

  it("rejects an invalid proposal with 400", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/proposals",
      payload: { ...validProposal, title: "" },
    });
    expect(response.statusCode).toBe(400);
    expect(response.json().error).toBe("validation_failed");
  });

  it("rejects a self-dealing sponsorship proposal with 400", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/proposals",
      payload: {
        ...validProposal,
        beneficiary_details: {
          beneficiary_address: validProposal.author_uid,
        },
      },
    });
    expect(response.statusCode).toBe(400);
    expect(response.json().error).toBe(
      "Anti-self-dealing: beneficiary_address must not equal author_uid on sponsorship proposals.",
    );
  });

  it("returns 404 for a missing proposal", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/proposals/00000000-0000-0000-0000-000000000000",
    });
    expect(response.statusCode).toBe(404);
  });

  it("lists proposals filtered by buccId", async () => {
    await app.inject({
      method: "POST",
      url: "/proposals",
      payload: validProposal,
    });
    await app.inject({
      method: "POST",
      url: "/proposals",
      payload: {
        ...validProposal,
        origin_bucc_id: "22222222-2222-2222-2222-222222222222",
      },
    });

    const response = await app.inject({
      method: "GET",
      url: `/proposals?buccId=${buccId}`,
    });
    expect(response.statusCode).toBe(200);
    const proposals = response.json();
    expect(proposals).toHaveLength(1);
    expect(proposals[0]?.origin_bucc_id).toBe(buccId);
  });

  it("lists votes for a proposal", async () => {
    const created = (
      await app.inject({
        method: "POST",
        url: "/proposals",
        payload: validProposal,
      })
    ).json();

    await app.inject({
      method: "POST",
      url: "/votes",
      payload: {
        target_id: created.proposal_id,
        voter_uid: "uid-voter-1",
        vote_weight: "1",
        origin_bucc_id: buccId,
      },
    });
    await app.inject({
      method: "POST",
      url: "/votes",
      payload: {
        target_id: created.proposal_id,
        voter_uid: "uid-voter-2",
        vote_weight: "4",
        origin_bucc_id: buccId,
      },
    });

    const response = await app.inject({
      method: "GET",
      url: `/proposals/${created.proposal_id}/votes`,
    });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toHaveLength(2);
  });

  it("returns 409 on a duplicate vote", async () => {
    const created = (
      await app.inject({
        method: "POST",
        url: "/proposals",
        payload: validProposal,
      })
    ).json();

    const payload = {
      target_id: created.proposal_id,
      voter_uid: "uid-voter",
      vote_weight: "1",
      origin_bucc_id: buccId,
    };

    await app.inject({ method: "POST", url: "/votes", payload });

    const duplicate = await app.inject({
      method: "POST",
      url: "/votes",
      payload,
    });
    expect(duplicate.statusCode).toBe(409);
  });

  it("rejects a vote with an invalid weight with 400", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/votes",
      payload: {
        target_id: "00000000-0000-0000-0000-000000000000",
        voter_uid: "uid-voter",
        vote_weight: "not-a-number",
        origin_bucc_id: buccId,
      },
    });
    expect(response.statusCode).toBe(400);
  });

  it("computes the quadratic tally for a proposal", async () => {
    const created = (
      await app.inject({
        method: "POST",
        url: "/proposals",
        payload: validProposal,
      })
    ).json();

    await app.inject({
      method: "POST",
      url: "/votes",
      payload: {
        target_id: created.proposal_id,
        voter_uid: "uid-voter-1",
        vote_weight: "1",
        origin_bucc_id: buccId,
      },
    });
    await app.inject({
      method: "POST",
      url: "/votes",
      payload: {
        target_id: created.proposal_id,
        voter_uid: "uid-voter-2",
        vote_weight: "4",
        origin_bucc_id: buccId,
      },
    });

    const response = await app.inject({
      method: "GET",
      url: `/proposals/${created.proposal_id}/tally`,
    });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      vote_count: 2,
      total_weight: "5",
      total_credits: "17",
      quadratic_support: "9",
    });
  });

  it("returns 404 for a tally on a missing proposal", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/proposals/00000000-0000-0000-0000-000000000000/tally",
    });
    expect(response.statusCode).toBe(404);
  });

  it("rejects a vote whose cost exceeds the credit budget", async () => {
    const created = (
      await app.inject({
        method: "POST",
        url: "/proposals",
        payload: validProposal,
      })
    ).json();

    const response = await app.inject({
      method: "POST",
      url: "/votes",
      payload: {
        target_id: created.proposal_id,
        voter_uid: "uid-big-spender",
        vote_weight: "11",
        origin_bucc_id: buccId,
      },
    });
    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual({
      error: "voting_budget_exceeded",
      budget: 100,
      spent: 0,
      cost: 121,
    });
  });

  it("enforces the credit budget across a voter's proposals", async () => {
    const proposalA = (
      await app.inject({
        method: "POST",
        url: "/proposals",
        payload: validProposal,
      })
    ).json();
    const proposalB = (
      await app.inject({
        method: "POST",
        url: "/proposals",
        payload: validProposal,
      })
    ).json();

    const first = await app.inject({
      method: "POST",
      url: "/votes",
      payload: {
        target_id: proposalA.proposal_id,
        voter_uid: "uid-budget",
        vote_weight: "10",
        origin_bucc_id: buccId,
      },
    });
    expect(first.statusCode).toBe(201);

    const overBudget = await app.inject({
      method: "POST",
      url: "/votes",
      payload: {
        target_id: proposalB.proposal_id,
        voter_uid: "uid-budget",
        vote_weight: "1",
        origin_bucc_id: buccId,
      },
    });
    expect(overBudget.statusCode).toBe(400);
    expect(overBudget.json().error).toBe("voting_budget_exceeded");
    expect(overBudget.json()).toMatchObject({ spent: 100, cost: 1 });
  });

  it("allows a voter to spend the full budget across proposals", async () => {
    const proposalA = (
      await app.inject({
        method: "POST",
        url: "/proposals",
        payload: validProposal,
      })
    ).json();
    const proposalB = (
      await app.inject({
        method: "POST",
        url: "/proposals",
        payload: validProposal,
      })
    ).json();

    for (const [proposal, weight] of [
      [proposalA, "6"],
      [proposalB, "8"],
    ] as const) {
      const response = await app.inject({
        method: "POST",
        url: "/votes",
        payload: {
          target_id: proposal.proposal_id,
          voter_uid: "uid-full-budget",
          vote_weight: weight,
          origin_bucc_id: buccId,
        },
      });
      expect(response.statusCode).toBe(201);
    }
  });
});

describe("KYC webhook and cooling-off", () => {
  let container: StartedPostgreSqlContainer;
  let pool: Pool;
  let app: FastifyInstance;

  beforeAll(async () => {
    container = await new PostgreSqlContainer("postgres:16-alpine")
      .withDatabase("test")
      .withUsername("test")
      .withPassword("test")
      .start();

    const poolConfig: PoolConfig = {
      host: container.getHost(),
      port: container.getPort(),
      database: container.getDatabase(),
      user: container.getUsername(),
      password: container.getPassword(),
    };

    await migrateToLatest(poolConfig);

    pool = new Pool(poolConfig);
    app = await createServer({
      store: PostgresProposalStore.fromPool(pool),
      userStore: PostgresUserStore.fromPool(pool),
      minter: fakeMinter,
    });
  });

  afterAll(async () => {
    await app.close();
    await pool.end();
    await container.stop();
  });

  beforeEach(async () => {
    await pool.query("DELETE FROM users");
  });

  const uid = "uid-investor";

  it("starts the cooling-off period on a KYC_PASSED webhook", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/webhooks/kyc",
      payload: {
        user_uid: uid,
        status: "passed",
        risk_band: "MEDIUM",
      },
    });

    expect(response.statusCode).toBe(202);
    const body = response.json();
    expect(body.status).toBe("accepted");
    expect(body.user_uid).toBe(uid);
    expect(new Date(body.cooling_off_ends_at).getTime()).toBeGreaterThan(
      Date.now(),
    );
  });

  it("surfaces the cooling-off window on GET /users/:uid", async () => {
    await app.inject({
      method: "POST",
      url: "/webhooks/kyc",
      payload: { user_uid: uid, status: "passed", risk_band: "LOW" },
    });

    const response = await app.inject({
      method: "GET",
      url: `/users/${uid}`,
    });
    expect(response.statusCode).toBe(200);
    const user = response.json();
    expect(user.kyc_status).toBe("passed");
    expect(user.risk_band).toBe("LOW");
    expect(user.cooling_off_ends_at).not.toBeNull();
    expect(user.cooling_off_complete).toBe(false);
    expect(user.can_mint).toBe(false);
  });

  it("allows minting once the cooling-off period has elapsed", async () => {
    await app.inject({
      method: "POST",
      url: "/webhooks/kyc",
      payload: { user_uid: uid, status: "passed" },
    });

    // Fast-forward past the 24h window.
    const { rowCount } = await pool.query(
      `UPDATE users SET cooling_off_ends_at = NOW() - INTERVAL '1 minute' WHERE user_uid = $1`,
      [uid],
    );
    expect(rowCount).toBe(1);

    const response = await app.inject({
      method: "GET",
      url: `/users/${uid}`,
    });
    const user = response.json();
    expect(user.cooling_off_complete).toBe(true);
    expect(user.can_mint).toBe(true);
  });

  it("defaults risk band to PENDING when not supplied", async () => {
    await app.inject({
      method: "POST",
      url: "/webhooks/kyc",
      payload: { user_uid: uid, status: "passed" },
    });

    const response = await app.inject({
      method: "GET",
      url: `/users/${uid}`,
    });
    expect(response.json().risk_band).toBe("PENDING");
  });

  it("ignores non-passed events", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/webhooks/kyc",
      payload: { user_uid: uid, status: "failed" },
    });
    expect(response.statusCode).toBe(202);
    expect(response.json().status).toBe("ignored");

    const user = await app.inject({ method: "GET", url: `/users/${uid}` });
    expect(user.statusCode).toBe(404);
  });

  it("rejects a malformed webhook with 400", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/webhooks/kyc",
      payload: { user_uid: "", status: "passed" },
    });
    expect(response.statusCode).toBe(400);
  });
});

describe("UID mint endpoint", () => {
  let container: StartedPostgreSqlContainer;
  let pool: Pool;
  let app: FastifyInstance;
  let minter: jest.Mocked<UidMinter>;

  beforeAll(async () => {
    container = await new PostgreSqlContainer("postgres:16-alpine")
      .withDatabase("test")
      .withUsername("test")
      .withPassword("test")
      .start();

    const poolConfig: PoolConfig = {
      host: container.getHost(),
      port: container.getPort(),
      database: container.getDatabase(),
      user: container.getUsername(),
      password: container.getPassword(),
    };

    await migrateToLatest(poolConfig);

    pool = new Pool(poolConfig);
  });

  afterAll(async () => {
    await pool.end();
    await container.stop();
  });

  beforeEach(async () => {
    await pool.query("DELETE FROM users");
    minter = {
      mintUid: jest.fn(async () => ({ tokenId: "42" })),
    };
    app = await createServer({
      store: PostgresProposalStore.fromPool(pool),
      userStore: PostgresUserStore.fromPool(pool),
      minter,
    });
  });

  afterEach(async () => {
    await app.close();
  });

  const recipient = "0xabc123";

  async function eligibleUser() {
    await app.inject({
      method: "POST",
      url: "/webhooks/kyc",
      payload: { user_uid: recipient, status: "passed", risk_band: "LOW" },
    });
    const { rowCount } = await pool.query(
      `UPDATE users SET cooling_off_ends_at = NOW() - INTERVAL '1 minute' WHERE user_uid = $1`,
      [recipient],
    );
    expect(rowCount).toBe(1);
  }

  it("mints a UID once the user is eligible", async () => {
    await eligibleUser();

    const response = await app.inject({
      method: "POST",
      url: "/mint",
      payload: { user_uid: recipient },
    });
    expect(response.statusCode).toBe(201);
    expect(response.json()).toEqual({
      user_uid: recipient,
      uid_token_id: "42",
    });
    expect(minter.mintUid).toHaveBeenCalledWith(recipient);

    const user = await app.inject({
      method: "GET",
      url: `/users/${recipient}`,
    });
    expect(user.json().minted_uid_token_id).toBe("42");
  });

  it("returns 404 for an unknown user", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/mint",
      payload: { user_uid: recipient },
    });
    expect(response.statusCode).toBe(404);
    expect(minter.mintUid).not.toHaveBeenCalled();
  });

  it("returns 403 while the cooling-off period is still running", async () => {
    await app.inject({
      method: "POST",
      url: "/webhooks/kyc",
      payload: { user_uid: recipient, status: "passed", risk_band: "LOW" },
    });

    const response = await app.inject({
      method: "POST",
      url: "/mint",
      payload: { user_uid: recipient },
    });
    expect(response.statusCode).toBe(403);
    expect(response.json().error).toBe("mint_not_eligible");
    expect(minter.mintUid).not.toHaveBeenCalled();
  });

  it("returns 409 on a repeated mint and does not re-mint", async () => {
    await eligibleUser();
    await app.inject({
      method: "POST",
      url: "/mint",
      payload: { user_uid: recipient },
    });

    const duplicate = await app.inject({
      method: "POST",
      url: "/mint",
      payload: { user_uid: recipient },
    });
    expect(duplicate.statusCode).toBe(409);
    expect(duplicate.json().error).toBe("uid_already_minted");
    expect(minter.mintUid).toHaveBeenCalledTimes(1);
  });

  it("returns 502 when the on-chain mint fails", async () => {
    await eligibleUser();
    minter.mintUid.mockRejectedValueOnce(new MintUidError("RPC down"));

    const response = await app.inject({
      method: "POST",
      url: "/mint",
      payload: { user_uid: recipient },
    });
    expect(response.statusCode).toBe(502);
    expect(response.json().error).toBe("mint_failed");
  });

  it("rejects a malformed mint request with 400", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/mint",
      payload: { user_uid: "" },
    });
    expect(response.statusCode).toBe(400);
  });
});
