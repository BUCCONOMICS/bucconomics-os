export type KycStatus = "pending" | "passed" | "failed";

export type RiskBand = "LOW" | "MEDIUM" | "HIGH" | "PENDING";

export interface UserIdentity {
  user_uid: string;
  kyc_status: KycStatus;
  risk_band: RiskBand;
  /** When the 24h regulatory cooling-off period ends, or null if not started. */
  cooling_off_ends_at: Date | null;
  /** On-chain BUCC_UID token id once minted by the server, or null. */
  minted_uid_token_id: string | null;
  /** When the UID was minted on-chain, or null. */
  minted_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

/** Payload for the provider -> BUCCONOMICS KYC webhook. */
export interface KycWebhookEvent {
  user_uid: string;
  status: KycStatus;
  /** Optional risk band computed by the Private Intelligence Gateway. */
  risk_band?: RiskBand;
}
