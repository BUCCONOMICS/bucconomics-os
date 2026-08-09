import { describe, it, expect } from "@jest/globals";
import {
  computeQuadraticTally,
  creditCost,
  creditsSpent,
} from "../tally/quadratic.js";

describe("quadratic tally", () => {
  it("credits cost the square of the weight", () => {
    expect(creditCost("1")).toBe(1);
    expect(creditCost("4")).toBe(16);
    expect(creditCost("10")).toBe(100);
  });

  it("sums credits spent across weights", () => {
    expect(creditsSpent(["1", "4", "9"])).toBe(98);
    expect(creditsSpent([])).toBe(0);
  });

  it("computes an empty tally", () => {
    expect(computeQuadraticTally([])).toEqual({
      vote_count: 0,
      total_weight: "0",
      total_credits: "0",
      quadratic_support: "0",
    });
  });

  it("computes support as (sum of sqrt(weight))^2", () => {
    // sqrt(1) + sqrt(4) + sqrt(9) = 1 + 2 + 3 = 6 -> 36
    expect(computeQuadraticTally(["1", "4", "9"])).toEqual({
      vote_count: 3,
      total_weight: "14",
      total_credits: "98",
      quadratic_support: "36",
    });
  });

  it("handles non-perfect-square weights without float artifacts", () => {
    // sqrt(2) + sqrt(8) = 4.2426..., squared = 18 exactly
    const tally = computeQuadraticTally(["2", "8"]);
    expect(tally.total_weight).toBe("10");
    expect(tally.total_credits).toBe("68");
    expect(tally.quadratic_support).toBe("18");
  });
});
