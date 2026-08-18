import { z } from "zod";

const expectedAccountIdSchema = z.string().regex(/^\d{12}$/);
const privateCidrSchema = z
  .string()
  .regex(/^10\.(?:[0-9]|[1-9]\d|1\d\d|2[0-4]\d|25[0-5])\.0\.0\/16$/);

export const awsFoundationConfigSchema = z
  .object({
    name: z.string().trim().min(1),
    region: z.string().trim().min(1),
    expectedAccountId: expectedAccountIdSchema,
    vpcCidr: privateCidrSchema,
    mode: z.enum(["practice", "live"]).default("practice"),
    dbAllocatedStorageGiB: z.number().int().min(20).max(1024).default(20),
    dbBackupRetentionDays: z.number().int().min(7).max(35).default(7),
    dbInstanceClass: z.string().trim().min(1).default("db.t4g.medium"),
    lambdaMemorySize: z.number().int().min(128).max(10240).default(512),
    lambdaTimeoutSeconds: z.number().int().min(30).max(900).default(900),
  })
  .strict();

export type AwsFoundationConfig = z.infer<typeof awsFoundationConfigSchema>;
export type AwsFoundationConfigInput = z.input<
  typeof awsFoundationConfigSchema
>;

export function parseAwsFoundationConfig(value: unknown): AwsFoundationConfig {
  return awsFoundationConfigSchema.parse(value);
}
