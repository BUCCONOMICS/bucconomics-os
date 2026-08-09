export type KycStatus = "pending" | "passed" | "failed";

export type RiskBand = "LOW" | "MEDIUM" | "HIGH" | "PENDING";

export interface UserIdentity {
  user_uid: string;
  kyc_status: KycStatus;
  risk_band: RiskBand;
  /** When the 24h regulatory cooling-off period ends, or null if not started. */
  cooling_off_ends_at: Date | null;
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
