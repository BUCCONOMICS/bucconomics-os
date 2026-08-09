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
import { migrateToLatest, PostgresProposalStore } from "@repo/db";
import { createServer } from "../src/server.js";

jest.setTimeout(120_000);

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
});
