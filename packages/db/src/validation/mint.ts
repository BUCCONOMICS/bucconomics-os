import { z } from "zod";

export const mintUidInputSchema = z
  .object({
    user_uid: z.string().min(1),
  })
  .strict();

export function validateMintUidInput(input: unknown): {
  user_uid: string;
} {
  return mintUidInputSchema.parse(input);
}
