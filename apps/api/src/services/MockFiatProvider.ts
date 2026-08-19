import type { IFiatProvider } from "@repo/types";

export class MockFiatProvider implements IFiatProvider {
  async initiateOnramp(
    amount: number,
    currency: string,
    userAddress: string,
  ): Promise<string> {
    const url = new URL("https://mock-fiat.local/onramp");
    url.searchParams.set("amount", amount.toString());
    url.searchParams.set("currency", currency);
    url.searchParams.set("userAddress", userAddress);

    return url.toString();
  }

  async verifyKYC(userId: string): Promise<boolean> {
    return userId.endsWith("_VERIFIED");
  }
}
