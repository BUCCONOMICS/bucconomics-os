import { describe, it, expect } from "@jest/globals";
import { validateCreateProposalInput } from "../validation/proposal.js";
import { validateCreateVoteInput } from "../validation/vote.js";
import { ValidationError } from "../errors/index.js";

describe("validation", () => {
  describe("createProposalInputSchema", () => {
    const baseInput = {
      origin_bucc_id: "11111111-1111-1111-1111-111111111111",
      author_uid: "uid-1",
      type: "sponsorship_proposal" as const,
      title: "Sponsor a project",
      body: "We need funding.",
    };

    it("validates a complete proposal input", () => {
      const input = validateCreateProposalInput({
        ...baseInput,
        beneficiary_details: {
          beneficiary_address: "uid-2",
          payout_token: "USDC",
          requested_amount: "1000",
        },
        tags: ["funding", "community"],
      });

      expect(input.beneficiary_details).toEqual({
        beneficiary_address: "uid-2",
        payout_token: "USDC",
        requested_amount: "1000",
      });
      expect(input.tags).toEqual(["funding", "community"]);
    });

    it("rejects sponsorship proposals where beneficiary equals author", () => {
      expect(() =>
        validateCreateProposalInput({
          ...baseInput,
          beneficiary_details: {
            beneficiary_address: "uid-1",
          },
        }),
      ).toThrow(ValidationError);
    });

    it("allows non-sponsorship proposals with matching author/beneficiary", () => {
      expect(() =>
        validateCreateProposalInput({
          ...baseInput,
          type: "idea",
          beneficiary_details: {
            beneficiary_address: "uid-1",
          },
        }),
      ).not.toThrow();
    });

    it("rejects invalid UUIDs", () => {
      expect(() =>
        validateCreateProposalInput({
          ...baseInput,
          origin_bucc_id: "not-a-uuid",
        }),
      ).toThrow();
    });

    it("rejects missing required fields", () => {
      expect(() =>
        validateCreateProposalInput({
          origin_bucc_id: "11111111-1111-1111-1111-111111111111",
          type: "idea",
        }),
      ).toThrow();
    });
  });

  describe("createVoteInputSchema", () => {
    it("validates a vote input", () => {
      const input = validateCreateVoteInput({
        target_id: "11111111-1111-1111-1111-111111111111",
        voter_uid: "uid-1",
        vote_weight: "9",
        origin_bucc_id: "22222222-2222-2222-2222-222222222222",
      });

      expect(input.vote_weight).toBe("9");
    });

    it("rejects non-numeric vote_weight", () => {
      expect(() =>
        validateCreateVoteInput({
          target_id: "11111111-1111-1111-1111-111111111111",
          voter_uid: "uid-1",
          vote_weight: "abc",
          origin_bucc_id: "22222222-2222-2222-2222-222222222222",
        }),
      ).toThrow();
    });

    it("rejects missing fields", () => {
      expect(() =>
        validateCreateVoteInput({
          target_id: "11111111-1111-1111-1111-111111111111",
          voter_uid: "uid-1",
        }),
      ).toThrow();
    });
  });
});
