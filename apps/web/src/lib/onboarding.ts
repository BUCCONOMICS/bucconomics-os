import type { Address } from "@repo/interfaces";
import type { Answers } from "../components/compliance/SuitabilityQuiz";

export type RiskBand = "LOW" | "MEDIUM" | "HIGH";

/** Maps an average quiz risk score to a band, mirroring IUserIdentity. */
export function computeRiskBand(answers: Answers): RiskBand {
  const values = Object.values(answers);
  const average =
    values.reduce((sum, answer) => sum + answer.riskLevel, 0) /
    (values.length || 1);
  if (average <= 2) return "LOW";
  if (average <= 3) return "MEDIUM";
  return "HIGH";
}

/**
 * Simulated identity mint. Returns a deterministic-looking token id for the
 * account. In production the server (holding the BUCC_UID owner key) would
 * mint on-chain; the forge Demo script exercises that path today.
 */
export function simulateMintUid(address: Address): bigint {
  const hash = [...address].reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return BigInt(hash % 100_000);
}
