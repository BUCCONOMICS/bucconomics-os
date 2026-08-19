import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import type { IWalletProvider } from "@repo/interfaces";
import { ProposalDetail } from "./ProposalDetail";
import { WalletProvider } from "../wallet/WalletProvider";
import {
  castVote,
  getProposal,
  getTally,
  getVoterCredits,
  listVotes,
  type Proposal,
  type ProposalTally,
  type VoterCredits,
} from "../../lib/api";

jest.mock("../../lib/api", () => ({
  getProposal: jest.fn(),
  getTally: jest.fn(),
  listVotes: jest.fn(),
  getVoterCredits: jest.fn(),
  castVote: jest.fn(),
}));

const mockConnected: { current: string | null } = { current: null };

const walletProvider: IWalletProvider = {
  getAddress: () => mockConnected.current as `0x${string}` | null,
  isConnected: () => mockConnected.current !== null,
  async connect() {
    const address = "0xabc123" as const;
    mockConnected.current = address;
    return { address, handle: { mock: true } };
  },
  async disconnect() {
    mockConnected.current = null;
  },
};

const mockedGetProposal = getProposal as jest.MockedFunction<
  typeof getProposal
>;
const mockedGetTally = getTally as jest.MockedFunction<typeof getTally>;
const mockedListVotes = listVotes as jest.MockedFunction<typeof listVotes>;
const mockedGetVoterCredits = getVoterCredits as jest.MockedFunction<
  typeof getVoterCredits
>;
const mockedCastVote = castVote as jest.MockedFunction<typeof castVote>;

const proposal: Proposal = {
  proposal_id: "p1",
  origin_bucc_id: "b1",
  author_uid: "uid-author",
  type: "sponsorship_proposal",
  title: "Solar for the market",
  body: "Install solar panels on the market roof.",
  beneficiary_details: {
    beneficiary_address: "0xRecipient",
    payout_token: "USDC",
    requested_amount: "1000",
  },
  tags: ["energy"],
  s3_key: null,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
};

const tally: ProposalTally = {
  vote_count: 2,
  total_weight: "5",
  total_credits: "17",
  quadratic_support: "9",
};

const freshCredits: VoterCredits = {
  votes: [],
  budget: 100,
  spent: 0,
  remaining: 100,
};

function mockLoaded(credits: VoterCredits | null = freshCredits) {
  mockedGetProposal.mockResolvedValue(proposal);
  mockedGetTally.mockResolvedValue(tally);
  mockedListVotes.mockResolvedValue([]);
  if (credits) {
    mockedGetVoterCredits.mockResolvedValue(credits);
  }
}

function renderProposal() {
  return render(
    <WalletProvider provider={walletProvider}>
      <ProposalDetail proposalId="p1" />
    </WalletProvider>,
  );
}

describe("ProposalDetail", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockConnected.current = null;
  });

  it("renders the proposal, tally and a connect prompt", async () => {
    mockLoaded();

    renderProposal();

    expect(
      await screen.findByRole("heading", { name: /Solar for the market/i }),
    ).toBeInTheDocument();
    expect(screen.getByText("17")).toBeInTheDocument();
    expect(screen.getByText("9")).toBeInTheDocument();
    expect(mockedGetVoterCredits).not.toHaveBeenCalled();
    expect(
      screen.getByRole("button", { name: /Connect wallet/i }),
    ).toBeInTheDocument();
  });

  it("loads the voter budget on connect", async () => {
    mockLoaded();

    renderProposal();
    fireEvent.click(
      await screen.findByRole("button", { name: /Connect wallet/i }),
    );

    await waitFor(() => {
      expect(mockedGetVoterCredits).toHaveBeenCalledWith("0xabc123");
    });
    expect(
      screen.getByText((_, node) =>
        Boolean(
          node?.tagName === "P" &&
          node.textContent?.includes("remaining") &&
          node.textContent?.includes("100"),
        ),
      ),
    ).toBeInTheDocument();
  });

  it("casts a vote and refreshes the tally", async () => {
    mockConnected.current = "0xabc123";
    mockLoaded();

    renderProposal();

    const input = await screen.findByLabelText(/Vote weight/i);
    fireEvent.change(input, { target: { value: "3" } });
    fireEvent.click(screen.getByRole("button", { name: /Cast vote/i }));

    await waitFor(() => {
      expect(mockedCastVote).toHaveBeenCalledWith({
        target_id: "p1",
        voter_uid: "0xabc123",
        vote_weight: "3",
        origin_bucc_id: "b1",
      });
    });
  });

  it("shows the cost and remaining credits while typing", async () => {
    mockConnected.current = "0xabc123";
    mockLoaded();

    renderProposal();

    const input = await screen.findByLabelText(/Vote weight/i);
    fireEvent.change(input, { target: { value: "3" } });

    expect(
      screen.getByText((_, node) =>
        Boolean(
          node?.tagName === "P" &&
          node.textContent?.includes("Costs") &&
          node.textContent?.includes("91 left after voting"),
        ),
      ),
    ).toBeInTheDocument();
  });

  it("surfaces a budget-exceeded error from the API", async () => {
    mockConnected.current = "0xabc123";
    mockLoaded({ ...freshCredits, remaining: 4 });
    mockedCastVote.mockRejectedValue(
      new Error("API request to /votes failed with status 400"),
    );

    renderProposal();

    const input = await screen.findByLabelText(/Vote weight/i);
    fireEvent.change(input, { target: { value: "2" } });
    fireEvent.click(screen.getByRole("button", { name: /Cast vote/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/status 400/);
  });

  it("blocks voting when the budget is exhausted", async () => {
    mockConnected.current = "0xabc123";
    mockLoaded({ ...freshCredits, remaining: 0 });

    renderProposal();

    expect(
      await screen.findByText(/spent your entire voting budget/i),
    ).toBeInTheDocument();
    expect(screen.queryByLabelText(/Vote weight/i)).not.toBeInTheDocument();
  });
});
