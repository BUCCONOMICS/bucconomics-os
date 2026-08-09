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
