export interface IFiatProvider {
  /** Initiates the fiat-to-crypto onramp process. Returns a session URL or TX ID. */
  initiateOnramp(
    amount: number,
    currency: string,
    userAddress: string,
  ): Promise<string>;

  /** Checks if the user has passed compliance/KYC via the provider. */
  verifyKYC(userId: string): Promise<boolean>;
}
