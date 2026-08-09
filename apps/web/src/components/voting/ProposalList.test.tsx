import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { ProposalList } from "./ProposalList";
import { listProposals } from "../../lib/api";

jest.mock("../../lib/api", () => ({
  listProposals: jest.fn(),
}));

const mockedListProposals = listProposals as jest.MockedFunction<
  typeof listProposals
>;

describe("ProposalList", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("lists proposals for the bucc", async () => {
    mockedListProposals.mockResolvedValue([
      {
        proposal_id: "p1",
        origin_bucc_id: "b1",
        author_uid: "uid-author",
        type: "idea",
        title: "Community garden",
        body: "Build a shared garden.",
        beneficiary_details: {},
        tags: ["garden"],
        s3_key: null,
        created_at: "2026-01-01T00:00:00Z",
        updated_at: "2026-01-01T00:00:00Z",
      },
    ]);

    render(<ProposalList buccId="b1" />);

    expect(mockedListProposals).toHaveBeenCalledWith("b1");
    expect(
      await screen.findByRole("heading", { name: /Community garden/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Community garden/i).closest("a")).toHaveAttribute(
      "href",
      "/proposals/p1",
    );
  });

  it("shows an empty state when there are no proposals", async () => {
    mockedListProposals.mockResolvedValue([]);

    render(<ProposalList buccId="b1" />);

    expect(
      await screen.findByText(/No proposals for this community yet/i),
    ).toBeInTheDocument();
  });

  it("shows an error when the API fails", async () => {
    mockedListProposals.mockRejectedValue(new Error("API down"));

    render(<ProposalList buccId="b1" />);

    expect(await screen.findByRole("alert")).toHaveTextContent(/API down/i);
  });
});
