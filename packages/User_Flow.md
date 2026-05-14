### Track A: The Investor Journey (Capital Supply)

The investor flow is designed to feel like a seamless Web2 fintech app, masking the complex Web3 infrastructure underneath.

**Phase 1: Onboarding & Compliance**

1. **The Landing Page:** The user signs up via standard email/password or social login.
2. **The Suitability Quiz:** The user must pass the Restricted Investor Quiz (Ticket 1). This ensures they understand the risks of DeFi and structured credit.
3. **KYC Verification:** The user submits their ID documents through the `IFiatProvider` UI (e.g., Transak).
4. **Behind the Scenes (API):** The provider sends a `KYC_PASSED` webhook to our API (Ticket 8). The Private Intelligence Gateway calculates their Risk Band and triggers a 24-hour regulatory "Cooling Off" timer.

**Phase 2: Wallet Creation & Identity**

1. **Account Generation:** Once the cooling-off period ends, the frontend uses the `IWalletProvider` to silently generate an ERC-4337 Smart Account for the user.
2. **Identity Minting:** The system automatically mints the `BUCC_UID` Token (Ticket 2) to their new smart account. This token holds their verified status and risk tier entirely on-chain.

**Phase 3: Funding & Yield Generation**

1. **Fiat On-Ramp:** The user decides to invest $1,000. They use their credit card or bank transfer via the `IFiatProvider`. The fiat is converted to USDC and sent to their Smart Account.
2. **Tranche Selection:** The user is presented with the Tranched Liquidity Pool UI. They can choose:

- **Senior Tranche:** Lower risk, fixed yield.
- **Junior Tranche:** Higher risk, variable yield (first-loss capital).

3. **Gasless Deposit:** The user clicks "Deposit." The transaction is routed through a Paymaster so the user pays zero gas fees. They instantly receive Pool Tokens representing their share of the yield (Ticket 7).

---

### Track B: The Funding Recipient Journey (Capital Demand)

The recipient flow is heavily tied to the off-chain Community Engine before any money actually moves on-chain.

**Phase 1: Proposal & Civic Approval**

1. **Drafting the Proposal:** A local business or project creator logs into the Community Engine and submits a Sponsorship Proposal (requesting funding, outlining the project plan).
2. **Data Validation:** The Node.js API validates the payload against the DynamoDB schema to ensure no malicious or malformed data is submitted (Ticket 5).
3. **The Community Vote:** Verified community members review the proposal and allocate voting credits. The system tallies these votes using the Quadratic Voting calculation engine (Ticket 4).

**Phase 2: Onboarding & Wallet Generation**

1. **Approval Notification:** If the proposal passes the community vote, the recipient is notified and prompted to complete their financial onboarding.
2. **KYC & Wallet:** Just like the investor, the recipient passes KYC via the `IFiatProvider` and a gasless ERC-4337 Smart Account is generated for them to securely hold the incoming funds.

**Phase 3: Drawdown & Off-Ramp**

1. **The Drawdown:** The approved recipient uses their Smart Account to execute a drawdown against the Tranched Liquidity Pool. The smart contracts verify that the DAO/Community Engine approved their specific wallet address.
2. **Receiving USDC:** The requested USDC is transferred from the Liquidity Pool into the recipient's Smart Account.
3. **Fiat Off-Ramp:** The recipient clicks "Withdraw to Bank." The `IFiatProvider` takes the USDC, converts it into their local fiat currency (e.g., KES, GBP, USD), and wires it directly to their traditional bank account.
