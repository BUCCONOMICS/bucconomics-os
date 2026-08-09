import type { RiskBand, UserIdentity } from "./types.js";

export interface IUserStore {
  /** Fetches a user identity, or null if unknown. */
  getUser(user_uid: string): Promise<UserIdentity | null>;
  /**
   * Records a passed KYC event, starting the cooling-off period. Creates the
   * user if it does not yet exist and overwrites any prior band/status.
   */
  recordKycPassed(input: {
    user_uid: string;
    risk_band: RiskBand;
    cooling_off_ends_at: Date;
  }): Promise<UserIdentity>;
}
