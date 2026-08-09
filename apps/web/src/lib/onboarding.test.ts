import { computeRiskBand, simulateMintUid } from "./onboarding";

const answers = (levels: number[]) =>
  Object.fromEntries(
    levels.map((riskLevel, index) => [
      index + 1,
      { value: `option-${index}`, riskLevel },
    ]),
  );

describe("computeRiskBand", () => {
  it("maps low scores to LOW", () => {
    expect(computeRiskBand(answers([1, 1, 1, 1, 1]))).toBe("LOW");
  });

  it("maps mid scores to MEDIUM", () => {
    expect(computeRiskBand(answers([3, 3, 3, 3, 3]))).toBe("MEDIUM");
  });

  it("maps high scores to HIGH", () => {
    expect(computeRiskBand(answers([4, 4, 4, 4, 4]))).toBe("HIGH");
  });
});

describe("simulateMintUid", () => {
  it("is deterministic per address", () => {
    const address = "0xabc";
    expect(simulateMintUid(address)).toBe(simulateMintUid(address));
  });
});
