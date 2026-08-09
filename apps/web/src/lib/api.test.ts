import { API_BASE_URL, getUserStatus, mintUid, recordKyc } from "./api";

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
});
