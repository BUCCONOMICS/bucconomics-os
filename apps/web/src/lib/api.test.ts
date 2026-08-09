import {
  API_BASE_URL,
  castVote,
  getProposal,
  getTally,
  getUserStatus,
  getVoterCredits,
  listProposals,
  listVotes,
  mintUid,
  recordKyc,
} from "./api";

describe("kyc api client", () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("records KYC via the webhook with the risk band", async () => {
    const coolingOffEndsAt = new Date(Date.now() + 24 * 3600 * 1000);
    const mockFetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 202,
      json: async () => ({
        status: "accepted",
        user_uid: "0xabc",
        cooling_off_ends_at: coolingOffEndsAt.toISOString(),
      }),
    });
    global.fetch = mockFetch as unknown as typeof fetch;

    await recordKyc("0xabc", "HIGH");

    expect(mockFetch).toHaveBeenCalledWith(
      `${API_BASE_URL}/webhooks/kyc`,
      expect.objectContaining({
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_uid: "0xabc",
          status: "passed",
          risk_band: "HIGH",
        }),
      }),
    );
  });

  it("returns null when the user has no KYC record", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 404,
      json: async () => ({}),
    }) as unknown as typeof fetch;

    await expect(getUserStatus("0xabc")).resolves.toBeNull();
  });

  it("throws on a server error", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({}),
    }) as unknown as typeof fetch;

    await expect(getUserStatus("0xabc")).rejects.toThrow(/500/);
  });

  it("throws when the webhook is rejected", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({}),
    }) as unknown as typeof fetch;

    await expect(recordKyc("0xabc", "LOW")).rejects.toThrow(/400/);
  });

  it("requests a server-side UID mint", async () => {
    const mockFetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 201,
      json: async () => ({ user_uid: "0xabc", uid_token_id: "42" }),
    });
    global.fetch = mockFetch as unknown as typeof fetch;

    await expect(mintUid("0xabc")).resolves.toEqual({
      user_uid: "0xabc",
      uid_token_id: "42",
    });
    expect(mockFetch).toHaveBeenCalledWith(
      `${API_BASE_URL}/mint`,
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ user_uid: "0xabc" }),
      }),
    );
  });

  it("surfaces a failed mint as an error", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 502,
      json: async () => ({ error: "mint_failed" }),
    }) as unknown as typeof fetch;

    await expect(mintUid("0xabc")).rejects.toThrow(/502/);
  });

  it("lists proposals for a bucc", async () => {
    const mockFetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => [{ proposal_id: "p1", title: "Solar" }],
    });
    global.fetch = mockFetch as unknown as typeof fetch;

    await listProposals("bucc-1");
    expect(mockFetch).toHaveBeenCalledWith(
      `${API_BASE_URL}/proposals?buccId=bucc-1`,
      expect.any(Object),
    );
  });

  it("returns null for a missing proposal", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 404,
      json: async () => ({}),
    }) as unknown as typeof fetch;

    await expect(getProposal("p1")).resolves.toBeNull();
  });

  it("fetches the tally, votes and voter credits", async () => {
    const mockFetch = jest
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ vote_count: 2, quadratic_support: "9" }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => [{ voter_uid: "v1" }],
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ budget: 100, spent: 0, remaining: 100 }),
      });
    global.fetch = mockFetch as unknown as typeof fetch;

    await expect(getTally("p1")).resolves.toMatchObject({
      vote_count: 2,
    });
    await expect(listVotes("p1")).resolves.toHaveLength(1);
    await expect(getVoterCredits("v1")).resolves.toMatchObject({
      remaining: 100,
    });
  });

  it("casts a vote", async () => {
    const mockFetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 201,
      json: async () => ({
        target_id: "p1",
        voter_uid: "v1",
        vote_weight: "3",
        origin_bucc_id: "b1",
      }),
    });
    global.fetch = mockFetch as unknown as typeof fetch;

    await castVote({
      target_id: "p1",
      voter_uid: "v1",
      vote_weight: "3",
      origin_bucc_id: "b1",
    });
    expect(mockFetch).toHaveBeenCalledWith(
      `${API_BASE_URL}/votes`,
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          target_id: "p1",
          voter_uid: "v1",
          vote_weight: "3",
          origin_bucc_id: "b1",
        }),
      }),
    );
  });

  it("surfaces a budget-exceeded vote error", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({ error: "voting_budget_exceeded" }),
    }) as unknown as typeof fetch;

    await expect(castVote({} as never)).rejects.toThrow(/400/);
  });
});
