import type { VoteTally } from "@repo/interfaces";

/**
 * Quadratic voting: casting a vote with weight `w` costs `w^2` credits, and a
 * proposal's support is `(sum sqrt(w))^2` over all votes it receives. This
 * bounds the influence of a single voter relative to a crowd.
 */

/** Credits a vote of the given weight costs. */
export function creditCost(weight: string): number {
  const value = Number(weight);
  return value * value;
}

/** Total credits spent across a set of vote weights. */
export function creditsSpent(weights: Iterable<string>): number {
  let total = 0;
  for (const weight of weights) {
    total += creditCost(weight);
  }
  return total;
}

/** Computes the quadratic tally for a set of vote weights. */
export function computeQuadraticTally(weights: Iterable<string>): VoteTally {
  let voteCount = 0;
  let totalWeight = 0;
  let totalCredits = 0;
  let sqrtSum = 0;

  for (const weight of weights) {
    const value = Number(weight);
    voteCount += 1;
    totalWeight += value;
    totalCredits += creditCost(weight);
    sqrtSum += Math.sqrt(value);
  }

  return {
    vote_count: voteCount,
    total_weight: formatNumber(totalWeight),
    total_credits: formatNumber(totalCredits),
    quadratic_support: formatNumber(sqrtSum * sqrtSum),
  };
}

function formatNumber(value: number): string {
  if (Number.isInteger(value)) {
    return String(value);
  }
  return value.toFixed(6).replace(/0+$/, "").replace(/\.$/, "");
}
