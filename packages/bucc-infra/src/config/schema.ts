import { z } from "zod";

const regionPattern = /^[a-z](?:[a-z0-9-]{0,61}[a-z0-9])?$/;
const nonEmptyString = z.string().trim().min(1);

export const providerConfigSchema = z.discriminatedUnion("mode", [
  z
    .object({
      provider: nonEmptyString,
      mode: z.literal("sandbox"),
    })
    .strict(),
  z
    .object({
      provider: nonEmptyString,
      mode: z.literal("credentials"),
      credentialSecretRef: nonEmptyString,
    })
    .strict(),
]);

export const rpcConfigSchema = z.discriminatedUnion("mode", [
  z
    .object({
      mode: z.literal("public"),
      endpoint: z.string().url(),
    })
    .strict(),
  z
    .object({
      mode: z.literal("credentials"),
      provider: nonEmptyString,
      credentialSecretRef: nonEmptyString,
    })
    .strict(),
]);

export const buccConfigSchema = z
  .object({
    name: nonEmptyString,
    region: z
      .string()
      .min(2)
      .regex(regionPattern, { message: "Invalid cloud region" }),
    contactEmail: z.string().email(),
    mode: z.enum(["practice", "live"]),
    kycProvider: providerConfigSchema,
    financialProvider: providerConfigSchema,
    rpc: rpcConfigSchema,
    reviewCadenceHours: z.number().int().positive(),
    budgetThreshold: z.number().positive(),
  })
  .strict();

export type BuccProviderConfig = z.infer<typeof providerConfigSchema>;
export type BuccRpcConfig = z.infer<typeof rpcConfigSchema>;
export type BuccConfig = z.infer<typeof buccConfigSchema>;

export function parseBuccConfig(value: unknown): BuccConfig {
  return buccConfigSchema.parse(value);
}
