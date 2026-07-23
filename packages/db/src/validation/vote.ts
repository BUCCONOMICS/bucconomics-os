import { z } from "zod";
import type { CreateVoteInput } from "@repo/interfaces";

const decimalStringSchema = z.string().regex(/^\d+$/, {
  message: "vote_weight must be a non-negative decimal string",
});

export const createVoteInputSchema = z
  .object({
    target_id: z.string().uuid(),
    voter_uid: z.string().min(1),
    vote_weight: decimalStringSchema,
    origin_bucc_id: z.string().uuid(),
  })
  .strict();

export function validateCreateVoteInput(input: unknown): CreateVoteInput {
  return createVoteInputSchema.parse(input);
}
