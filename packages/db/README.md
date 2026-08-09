# @repo/db

PostgreSQL schema, migrations, validation, and repository implementation for BUCCONOMICS proposals and votes.

## What's inside

- **Migrations:** Kysely `Migrator` + `FileMigrationProvider` running TypeScript migration files under `src/migrations/`.
- **Schema:** Kysely `Database` type for the `proposals`, `votes` and `users` tables.
- **Validation:** Zod-based validators for creating proposals and votes, including the anti-self-dealing rule for sponsorship proposals.
- **Repository:** `PostgresProposalStore` implementing `IProposalStore` and
  `PostgresUserStore` implementing `IUserStore`, both from `@repo/interfaces`.

## Running tests

Tests use [testcontainers](https://testcontainers.com/) to spin up a real Postgres container, so **Docker must be running**.

```bash
npm test --workspace=@repo/db
```

The Jest configuration uses ECMAScript modules, so the test script sets `NODE_OPTIONS=--experimental-vm-modules` automatically.

## Migrations

To run migrations against a real database:

```typescript
import { migrateToLatest } from "@repo/db/migrations";

await migrateToLatest({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});
```

## Design notes

- `proposals` and `votes` both carry `origin_bucc_id` to preserve the federation seam.
- `proposal_id` and `origin_bucc_id` are UUIDs.
- `votes` has a composite primary key `(target_id, voter_uid)` which enforces double-vote prevention at the database level.
- `vote_weight` is stored as `NUMERIC(78, 0)` to match uint256-scale values.
- No PII or image binaries are stored in Postgres; `s3_key` references external media.
