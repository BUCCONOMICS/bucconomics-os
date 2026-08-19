import { MockFiatProvider } from "../src/services/MockFiatProvider.js";

describe("MockFiatProvider", () => {
  const provider = new MockFiatProvider();

  it("approves user IDs ending in _VERIFIED", async () => {
    await expect(provider.verifyKYC("test-user_VERIFIED")).resolves.toBe(true);
  });

  it("rejects other user IDs", async () => {
    await expect(provider.verifyKYC("test-user")).resolves.toBe(false);
  });

  it("returns a fake on-ramp URL containing the request", async () => {
    const result = await provider.initiateOnramp(100, "GBP", "0x123");
    const url = new URL(result);

    expect(url.origin).toBe("https://mock-fiat.local");
    expect(url.pathname).toBe("/onramp");
    expect(url.searchParams.get("amount")).toBe("100");
    expect(url.searchParams.get("currency")).toBe("GBP");
    expect(url.searchParams.get("userAddress")).toBe("0x123");
  });
});
