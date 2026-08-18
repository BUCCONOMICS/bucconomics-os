import { describe, expect, it } from "@jest/globals";

import { buccConfigSchema, parseBuccConfig } from "./schema.js";

const validConfig = {
  name: "harbour-bucc",
  region: "eu-west-2",
  contactEmail: "ops@example.com",
  mode: "practice",
  kycProvider: { provider: "mock-kyc", mode: "sandbox" },
  financialProvider: {
    provider: "transak",
    mode: "credentials",
    credentialSecretRef: "secret://financial-provider",
  },
  rpc: { mode: "public", endpoint: "https://rpc.example.com" },
  reviewCadenceHours: 168,
  budgetThreshold: 100,
} as const;

describe("buccConfigSchema", () => {
  it("parses a valid operator configuration", () => {
    expect(parseBuccConfig(validConfig)).toEqual(validConfig);
  });

  it("reports field paths for missing and malformed values", () => {
    const result = buccConfigSchema.safeParse({
      ...validConfig,
      region: "EU west",
      contactEmail: undefined,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.map((issue) => issue.path.join("."))).toEqual(
        expect.arrayContaining(["region", "contactEmail"]),
      );
    }
  });

  it("rejects malformed provider states and unknown fields", () => {
    expect(
      buccConfigSchema.safeParse({
        ...validConfig,
        kycProvider: {
          provider: "mock-kyc",
          mode: "sandbox",
          credentialSecretRef: "secret://unexpected",
        },
      }).success,
    ).toBe(false);
    expect(
      buccConfigSchema.safeParse({ ...validConfig, unexpected: true }).success,
    ).toBe(false);
  });

  it("requires positive cadence and budget values", () => {
    expect(
      buccConfigSchema.safeParse({ ...validConfig, reviewCadenceHours: 0 })
        .success,
    ).toBe(false);
    expect(
      buccConfigSchema.safeParse({ ...validConfig, budgetThreshold: 0 })
        .success,
    ).toBe(false);
  });
});
