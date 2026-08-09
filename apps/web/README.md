# BUCCONOMICS Web

Client-facing onboarding for BUCCONOMICS: the restricted-investor suitability
quiz, smart-account connection, and the UID mint gate backed by the KYC /
cooling-off lifecycle in `apps/api`.

## Flow

1. **Suitability quiz** — 5 questions; the answers map to a risk band
   (`LOW`/`MEDIUM`/`HIGH`) via `computeRiskBand`.
2. **Smart account** — connect an ERC-4337 smart account (mocked today via
   `MockWalletProvider`).
3. **Identity mint** — on connect, the app records the quiz result through
   `POST /webhooks/kyc` (starting the 24h regulatory cooling-off) and polls
   `GET /users/:uid`. The **Mint BUCC_UID** button stays disabled with a
   countdown until `can_mint` is true. Returning users with a record are not
   re-recorded (the original cooling-off start is preserved). Clicking **Mint
   BUCC_UID** asks the server (`POST /mint`) to mint the soul-bound token
   on-chain; the returned token id replaces the old client-side simulation.
4. **Tranches** — senior/junior USDC deposit amounts.
5. **Done** — summary.

## Configuration

- `NEXT_PUBLIC_API_URL` — base URL of the API, defaults to
  `http://localhost:3001`. Point it at a running `apps/api` (which needs a
  Postgres database and `DATABASE_URL`).

## Scripts

- `npm run dev` — Next.js dev server on port 3000.
- `npm run build` — production build.
- `npm test` — jest (jsdom) component + lib tests.
- `npm run check-types` — `next typegen && tsc --noEmit`.
- `npm run lint` — eslint.

## Notes

- The UID mint runs server-side: the server holds the BUCC_UID owner key and
  signs the transaction via the `MintUid` forge script
  (`contracts/script/MintUid.s.sol`). The API needs `BUCC_UID_ADDRESS`,
  `MINT_OWNER_KEY` (and a running chain, e.g. anvil on `:8545`) for the mint
  to succeed.

## Voting

Proposal pages under `/proposals` use the API's proposal/vote endpoints:

- `/proposals` — list proposals for a BUCC and open a proposal detail page.
- `/proposals/:id` — proposal body, quadratic tally (`GET
/proposals/:id/tally`), per-voter votes, and a vote form. Connecting a
  wallet loads the voter's credit budget (`GET /votes?voter_uid=`); a weight
  of `w` costs `w²` credits (quadratic). The submit button is gated on a
  non-negative integer weight and a budget that still fits.
