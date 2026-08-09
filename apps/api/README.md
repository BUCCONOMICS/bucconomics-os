# @repo/api

HTTP API for the BUCCONOMICS Community Engine: proposal submission, civic
voting, and the KYC / cooling-off lifecycle, all over the PostgreSQL store
in `@repo/db`.

## Endpoints

| Method | Path                     | Description                                    |
| ------ | ------------------------ | ---------------------------------------------- |
| GET    | `/health`                | Liveness check                                 |
| POST   | `/proposals`             | Create a proposal (validated)                  |
| GET    | `/proposals?buccId=<id>` | List proposals for a BUCC                      |
| GET    | `/proposals/:id`         | Fetch a single proposal                        |
| GET    | `/proposals/:id/votes`   | List votes for a proposal                      |
| POST   | `/votes`                 | Cast a vote (`409` on duplicate)               |
| POST   | `/webhooks/kyc`          | Provider KYC event; starts cooling-off (`202`) |
| GET    | `/users/:uid`            | KYC status + `cooling_off_complete`/`can_mint` |

Error responses: `400` validation, `404` missing proposal/user, `409`
duplicate vote, `500` internal.

### KYC webhook

A `KYC_PASSED` event (`status: "passed"`, optionally with a `risk_band`
computed by the Private Intelligence Gateway) records the user and starts the
regulatory cooling-off window (default 24h, override with
`KYC_COOLING_OFF_HOURS`). `GET /users/:uid` reports `can_mint` once the window
has elapsed. Non-`passed` events are acknowledged and ignored.

## Usage

Requires a Postgres `DATABASE_URL`:

```bash
export DATABASE_URL=postgres://user:pass@localhost:5432/bucconomics

npm run migrate --workspace=@repo/api   # run migrations
npm run dev --workspace=@repo/api       # tsx watch on :3001
```

## Tests

Like `@repo/db`, tests use testcontainers and need Docker:

```bash
npm test --workspace=@repo/api
```

## Design notes

- Validation reuses the zod schemas from `@repo/db`, so the anti-self-dealing
  rule for sponsorship proposals is enforced at the API boundary.
- The store is injected into `createServer`, keeping the HTTP layer testable
  without a database.
- Recipient approval and drawdowns live on-chain (`TranchedPool.drawdown`);
  wiring this API to the contracts is the next step.
