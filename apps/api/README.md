# @repo/api

HTTP API for the BUCCONOMICS Community Engine: proposal submission, quadratic
civic voting, and the KYC / cooling-off lifecycle, all over the PostgreSQL
store in `@repo/db`.

## Endpoints

| Method | Path                     | Description                                      |
| ------ | ------------------------ | ------------------------------------------------ |
| GET    | `/health`                | Liveness check                                   |
| POST   | `/proposals`             | Create a proposal (validated)                    |
| GET    | `/proposals?buccId=<id>` | List proposals for a BUCC                        |
| GET    | `/proposals/:id`         | Fetch a single proposal                          |
| GET    | `/proposals/:id/votes`   | List votes for a proposal                        |
| GET    | `/proposals/:id/tally`   | Quadratic tally (`vote_count`, credits, support) |
| POST   | `/votes`                 | Cast a vote (`409` duplicate, `400` over budget) |
| GET    | `/votes?voter_uid=<id>`  | Voter credits: `budget`/`spent`/`remaining`      |
| POST   | `/webhooks/kyc`          | Provider KYC event; starts cooling-off (`202`)   |
| GET    | `/users/:uid`            | KYC status + `cooling_off_complete`/`can_mint`   |
| POST   | `/mint`                  | Mint the soul-bound UID on-chain (server-signed) |

Error responses: `400` validation or `voting_budget_exceeded`, `403`
`mint_not_eligible`, `404` missing proposal/user, `409` duplicate vote or
`uid_already_minted`, `502` `mint_failed`, `500` internal.

### Quadratic voting

Voting is quadratic: a vote with weight `w` costs `w^2` credits, and each
voter has a global credit budget (default 100, override with
`VOTING_CREDIT_BUDGET`). The budget is enforced across all proposals a voter
participates in. `GET /votes?voter_uid=<id>` returns the voter's `budget`,
`spent` (credits used so far) and `remaining`, so clients can gate the vote
form. `GET /proposals/:id/tally` returns:

- `vote_count` — number of votes
- `total_weight` — linear sum of weights
- `total_credits` — sum of squared weights (credits spent)
- `quadratic_support` — `(sum of sqrt(weight))^2`

### UID mint

`POST /mint` with `{ "user_uid": "0x..." }` mints the soul-bound BUCC_UID to
the smart account (the `user_uid` is treated as the recipient address) once
the user's KYC is `passed` and the cooling-off has elapsed. The server holds
the BUCC_UID owner key and signs the transaction through the `MintUid` forge
script (`contracts/script/MintUid.s.sol`). The mint is idempotent: a second
call returns `409 uid_already_minted`, and the resulting token id is recorded
on the user row.

Requires `BUCC_UID_ADDRESS` and `MINT_OWNER_KEY`; `MINT_RPC_URL` defaults to
`http://localhost:8545` (anvil). Requires `forge` on the API host's `PATH`.

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
export BUCC_UID_ADDRESS=0x...            # deployed BUCC_UID
export MINT_OWNER_KEY=0x...              # BUCC_UID owner private key

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
  wiring the API to those contracts is the next step.
- The mint endpoint is the API bridge to the chain: `ForgeUidMinter` shells out
  to `forge script script/MintUid.s.sol`, so no additional node-side ethers
  dependency is needed.
