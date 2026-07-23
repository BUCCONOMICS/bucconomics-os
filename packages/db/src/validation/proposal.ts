import { z } from "zod";
import type {
  BeneficiaryDetails,
  CreateProposalInput,
  ProposalType,
} from "@repo/interfaces";
import { ValidationError } from "../errors/index.js";

const proposalTypeSchema: z.ZodType<ProposalType> = z.enum([
  "sponsorship_proposal",
  "idea",
  "general",
]);

export const beneficiaryDetailsSchema = z
  .object({
    beneficiary_address: z.string().optional(),
    payout_token: z.string().optional(),
    requested_amount: z.string().optional(),
  })
  .passthrough() as z.ZodType<BeneficiaryDetails>;

export const createProposalInputSchema = z
  .object({
    origin_bucc_id: z.string().uuid(),
    author_uid: z.string().min(1),
    type: proposalTypeSchema,
    title: z.string().min(1).max(200),
    body: z.string().min(1).max(100_000),
    beneficiary_details: beneficiaryDetailsSchema.default({}),
    tags: z.array(z.string().min(1).max(50)).max(20).default([]),
    s3_key: z.string().nullable().optional(),
  })
  .strict();

export function validateCreateProposalInput(
  input: unknown,
): CreateProposalInput {
  const parsed = createProposalInputSchema.parse(input);

  if (parsed.type === "sponsorship_proposal") {
    const beneficiaryAddress = parsed.beneficiary_details.beneficiary_address;
    if (beneficiaryAddress && beneficiaryAddress === parsed.author_uid) {
      throw new ValidationError(
        "Anti-self-dealing: beneficiary_address must not equal author_uid on sponsorship proposals.",
        { field: "beneficiary_details.beneficiary_address" },
      );
    }
  }

  return parsed;
}
