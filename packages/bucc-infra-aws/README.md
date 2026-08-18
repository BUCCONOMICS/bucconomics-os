# @repo/bucc-infra-aws

AWS implementation package for BUCC foundational infrastructure.

## Ownership

- Resources are created with the operator's ambient AWS credentials in the operator's account.
- The package has no Foundation account, role, resource, or credential dependency.
- Consumes `@repo/bucc-infra` contracts and `@repo/db` migrations.

## Account guard and provider strategy

- `AwsFoundationConfig.expectedAccountId` is required and strictly validated as 12 digits.
- `createAwsFoundationImplementations()` lazily creates and caches an `aws.Provider` per `region:account` pair.
- The provider is configured with `allowedAccountIds=[expectedAccountId]`.
- Provider is merged into child opts; caller-provided opts are preserved.

## State bootstrap

The state backend cannot store the checkpoint that creates it on its first run.
The installer must create it from temporary operator-controlled state, retrieve
the generated passphrase from the emitted Secrets Manager ARN, log in to the
emitted `s3://` backend, and migrate or recreate the stack there. Bucket
versioning provides the state recovery history. The generated value remains an
encrypted Pulumi secret in the bootstrap checkpoint and is never a component
output.

## Security invariants

- State backend: S3 bucket, versioning, encryption, public access block, owner enforced, TLS-only policy, no public access, no force destroy.
- Network: private-only VPC, two private subnets, route table + associations, no public route, DB SG only from API SG on TCP 5432, Secrets Manager interface endpoint with dedicated endpoint SG.
- Keyring: two rotating customer-managed KMS keys, explicit account-local key policy only, 30 day deletion windows.
- Storage: reports and exports buckets, versioned, KMS encrypted, PAB, owner enforced, TLS-only policies.
- Database: private RDS PostgreSQL, storage encryption, managed master password, backup retention >= 7, force SSL, no plaintext password input/output, deletion protection on, final snapshot retained.
- Migration Lambda: private subnet + API SG, uses Secrets Manager and `@repo/db/migrations`, never receives plaintext password in env/input/output.

Outputs are opaque references: the backend is an S3 URI, key and bucket
references are ARNs, the database reference is its endpoint, the connection
reference is the RDS-managed secret ARN, and the migration reference is the
invocation result.

## Migration behavior

- `src/migrations/handler.ts` is bundled to `dist/migrations/index.mjs` during build.
- The runtime handler reads the RDS-managed secret via AWS SDK, validates required fields, and calls `migrateToLatest()` with `ssl.rejectUnauthorized=true`.
- The Lambda runs in the private subnets using the trusted database-client security group. Its failure propagates through `aws.lambda.Invocation` and fails the apply.
- `NODE_EXTRA_CA_CERTS=/var/runtime/ca-cert.pem` enables validation against the AWS RDS CA bundle.

## Costs

- RDS, interface endpoints, KMS, Secrets Manager, Lambda, and S3 all incur AWS charges.
- RDS is the dominant cost.
- No NAT gateway is created. A future public API requiring provider or RPC egress must make that decision separately.

## Testing limitations

- Tests use Pulumi mocks only.
- They assert security-sensitive inputs and output secrecy, but cannot validate real AWS policy enforcement or connectivity.
