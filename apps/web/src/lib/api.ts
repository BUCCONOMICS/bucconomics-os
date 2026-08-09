import type { RiskBand } from "./onboarding";

/** Base URL of the BUCCONOMICS API. Override with NEXT_PUBLIC_API_URL. */
export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export interface UserStatus {
  user_uid: string;
  kyc_status: "pending" | "passed" | "failed";
  risk_band: RiskBand | "PENDING";
  cooling_off_ends_at: string | null;
  cooling_off_complete: boolean;
  can_mint: boolean;
}

interface KycAccepted {
  status: "accepted";
  user_uid: string;
  cooling_off_ends_at: string;
}

export interface MintResult {
  user_uid: string;
  uid_token_id: string;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  if (!response.ok) {
    throw new Error(
      `API request to ${path} failed with status ${response.status}`,
    );
  }
  return (await response.json()) as T;
}

/** Records the quiz-derived risk band, starting the cooling-off timer. */
export function recordKyc(
  userUid: string,
  riskBand: RiskBand,
): Promise<KycAccepted> {
  return request<KycAccepted>("/webhooks/kyc", {
    method: "POST",
    body: JSON.stringify({
      user_uid: userUid,
      status: "passed",
      risk_band: riskBand,
    }),
  });
}

/** Fetches KYC status; returns null when the user has no record yet. */
export async function getUserStatus(
  userUid: string,
): Promise<UserStatus | null> {
  const response = await fetch(
    `${API_BASE_URL}/users/${encodeURIComponent(userUid)}`,
  );
  if (response.status === 404) {
    return null;
  }
  if (!response.ok) {
    throw new Error(
      `API request to /users/${userUid} failed with status ${response.status}`,
    );
  }
  return (await response.json()) as UserStatus;
}

/** Asks the server to mint the soul-bound UID on-chain. */
export function mintUid(userUid: string): Promise<MintResult> {
  return request<MintResult>("/mint", {
    method: "POST",
    body: JSON.stringify({ user_uid: userUid }),
  });
}
