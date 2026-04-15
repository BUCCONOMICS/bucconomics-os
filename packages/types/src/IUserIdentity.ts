export interface IUserIdentity {
  uid: string;
  walletAddress: string;
  isVerified: boolean;
  /** Risk band assigned after the Restricted Investor Quiz & cooling-off period */
  riskBand: "LOW" | "MEDIUM" | "HIGH" | "PENDING";
}
