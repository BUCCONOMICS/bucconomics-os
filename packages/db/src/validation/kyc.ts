import { z } from "zod";
import type { KycWebhookEvent, KycStatus, RiskBand } from "@repo/interfaces";

const kycStatusSchema: z.ZodType<KycStatus> = z.enum([
  "pending",
  "passed",
  "failed",
]);

const riskBandSchema: z.ZodType<RiskBand> = z.enum([
  "LOW",
  "MEDIUM",
  "HIGH",
  "PENDING",
]);

export const kycWebhookEventSchema = z
  .object({
    user_uid: z.string().min(1),
    status: kycStatusSchema,
    risk_band: riskBandSchema.optional(),
  })
  .strict();

export function validateKycWebhookEvent(input: unknown): KycWebhookEvent {
  return kycWebhookEventSchema.parse(input);
}
