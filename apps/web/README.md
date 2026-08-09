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
   re-recorded (the original cooling-off start is preserved).
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

- Identity minting is simulated (`simulateMintUid`). The real `BUCC_UID.mint`
  is owner-only on-chain; the server-side path is exercised by the forge Demo
  script (`contracts/script/Demo.s.sol`).
