# create-bucc

Foundation-first BUCC installer for CloudShell and local Node 22+ environments.

## Status

- Implements the foundation-first portion of GitHub issue #19.
- Runtime completion is intentionally deferred for `BuccApi`, `BuccReviewAgent`, and `BuccMonitoring`.
- Health checking is intentionally unavailable and remains tracked by issue 21.
- This package is private because current `@repo/*` dependencies block external npm publication.

The package must not be published as `create-bucc` until the infrastructure
packages are compiled and published under a public scope. Inside this monorepo,
`npm run build --workspace=create-bucc` produces the `dist/bin/create-bucc.js`
executable.

## CloudShell flow

1. Run the installer in AWS CloudShell using its ambient AWS identity.
2. Answer one business question per screen. Secret answers are masked.
3. Verify the displayed AWS account, region, and practice/live mode.
4. Only after confirmation, provider credentials are sent directly to Secrets Manager.
5. A temporary encrypted file backend creates the operator-owned S3 state backend.
6. The checkpoint is migrated to S3 and rotated to the generated passphrase.
7. The five available AWS foundation components are applied against S3 state.

The installer never asks for, generates, writes, or transmits AWS access keys.
The AWS SDK and Pulumi use the standard ambient credential chain.

## State transition

Pulumi Automation API does not expose stack migration or passphrase rotation,
so those two operations use a narrowly scoped non-shell process adapter pinned
to Pulumi 3.258.0. Passphrases are passed through a child-only environment and
stdin, never command arguments. The adapter suppresses child output because it
has not been proven secret-free. Its exact prompt behavior still requires a
CloudShell integration smoke test before general release.

Temporary state is encrypted and stored in a mode-0700 directory. It is removed
only after migration, passphrase rotation, and the S3-backed foundation apply
all succeed. If migration has started and the outcome is uncertain, the
encrypted recovery directory is retained and only its path is reported.

## Notes

- Uses ambient AWS identity only; no access keys are accepted or written.
- Provider credentials and RPC secrets are transient JavaScript strings and are written only through AWS Secrets Manager. JavaScript cannot guarantee memory zeroization.
- Tests inject the Automation, AWS, filesystem, and process boundaries; they never provision or read local profiles.
- The completed foundation incurs AWS costs, especially RDS, KMS, Secrets Manager, and interface endpoints, even while runtime components are deferred.

## Build

- `npm run build`
- `npm run test`
- `npm run lint`
- `npm run check-types`
