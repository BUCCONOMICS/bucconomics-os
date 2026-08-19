"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ConnectWalletButton } from "../wallet/ConnectWalletButton";
import { useSmartAccount } from "../../store/walletStore";
import {
  castVote,
  getProposal,
  getTally,
  getVoterCredits,
  listVotes,
  type Proposal,
  type ProposalTally,
  type VoterCredits,
  type Vote,
} from "../../lib/api";

export function ProposalDetail({ proposalId }: { proposalId: string }) {
  const { address } = useSmartAccount();
  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [missing, setMissing] = useState(false);
  const [tally, setTally] = useState<ProposalTally | null>(null);
  const [votes, setVotes] = useState<Vote[]>([]);
  const [credits, setCredits] = useState<VoterCredits | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [weight, setWeight] = useState("");
  const [voting, setVoting] = useState(false);
  const [voteError, setVoteError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const found = await getProposal(proposalId);
        if (cancelled) return;
        if (!found) {
          setMissing(true);
          return;
        }
        setProposal(found);
        const [nextTally, nextVotes] = await Promise.all([
          getTally(proposalId),
          listVotes(proposalId),
        ]);
        if (cancelled) return;
        setTally(nextTally);
        setVotes(nextVotes);
      } catch (error) {
        if (!cancelled) {
          setLoadError(
            error instanceof Error ? error.message : "Failed to load proposal",
          );
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [proposalId]);

  useEffect(() => {
    if (!address) {
      setCredits(null);
      return;
    }
    let cancelled = false;
    void getVoterCredits(address)
      .then((nextCredits) => {
        if (!cancelled) setCredits(nextCredits);
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setLoadError(
            error instanceof Error
              ? error.message
              : "Failed to load voter credits",
          );
        }
      });
    return () => {
      cancelled = true;
    };
  }, [address]);

  const handleVote = useCallback(async () => {
    if (!proposal || !address || voting) return;
    const voteWeight = weight.trim();
    if (!/^\d+$/.test(voteWeight)) {
      setVoteError("Vote weight must be a non-negative integer");
      return;
    }
    setVoting(true);
    setVoteError(null);
    try {
      await castVote({
        target_id: proposal.proposal_id,
        voter_uid: address,
        vote_weight: voteWeight,
        origin_bucc_id: proposal.origin_bucc_id,
      });
      setWeight("");
      const [nextTally, nextVotes, nextCredits] = await Promise.all([
        getTally(proposalId),
        listVotes(proposalId),
        getVoterCredits(address),
      ]);
      setTally(nextTally);
      setVotes(nextVotes);
      setCredits(nextCredits);
    } catch (error) {
      setVoteError(
        error instanceof Error ? error.message : "Failed to cast vote",
      );
    } finally {
      setVoting(false);
    }
  }, [proposal, address, weight, voting, proposalId]);

  if (missing) {
    return (
      <main className="min-h-screen bg-gray-100 py-12">
        <div className="max-w-2xl mx-auto p-6 bg-white shadow-lg rounded-lg text-center">
          <h1 className="text-2xl font-bold mb-4">Proposal not found</h1>
          <Link
            href="/proposals"
            className="text-blue-600 font-semibold hover:underline"
          >
            ← Back to proposals
          </Link>
        </div>
      </main>
    );
  }

  if (loadError) {
    return (
      <main className="min-h-screen bg-gray-100 py-12">
        <div
          role="alert"
          className="max-w-2xl mx-auto p-6 bg-red-50 text-red-800 rounded-lg"
        >
          Failed to load proposal: {loadError}
        </div>
      </main>
    );
  }

  if (!proposal || !tally) {
    return (
      <main className="min-h-screen bg-gray-100 py-12">
        <p role="status" className="text-center text-gray-600">
          Loading proposal…
        </p>
      </main>
    );
  }

  const cost =
    /^\d+$/.test(weight.trim()) && !voting
      ? Math.pow(Number(weight.trim()), 2)
      : null;
  const remainingAfter =
    cost !== null && credits ? credits.remaining - cost : null;
  const maxWeight =
    credits && credits.remaining > 0
      ? Math.floor(Math.sqrt(credits.remaining))
      : 0;

  return (
    <main className="min-h-screen bg-gray-100 py-12">
      <div className="max-w-4xl mx-auto p-6">
        <Link
          href="/proposals"
          className="text-blue-600 font-semibold hover:underline"
        >
          ← Back to proposals
        </Link>

        <div className="mt-4 p-6 bg-white shadow-lg rounded-lg">
          <p className="text-sm text-gray-500">{proposal.type}</p>
          <h1 className="text-3xl font-bold text-gray-900 mt-1">
            {proposal.title}
          </h1>
          <p className="text-gray-700 mt-3 whitespace-pre-line">
            {proposal.body}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {proposal.tags.map((tag) => (
              <span
                key={tag}
                className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>

        <div className="mt-6 grid gap-6 md:grid-cols-2">
          <section className="p-6 bg-white shadow-lg rounded-lg">
            <h2 className="text-xl font-bold mb-4">Tally</h2>
            <dl className="space-y-2 text-gray-700">
              <div className="flex justify-between">
                <dt>Votes</dt>
                <dd className="font-semibold">{tally.vote_count}</dd>
              </div>
              <div className="flex justify-between">
                <dt>Total weight</dt>
                <dd className="font-semibold">{tally.total_weight}</dd>
              </div>
              <div className="flex justify-between">
                <dt>Credits spent</dt>
                <dd className="font-semibold">{tally.total_credits}</dd>
              </div>
              <div className="flex justify-between">
                <dt>Quadratic support</dt>
                <dd className="font-semibold">{tally.quadratic_support}</dd>
              </div>
            </dl>

            <h3 className="text-lg font-semibold mt-6 mb-2">Votes</h3>
            {votes.length === 0 ? (
              <p className="text-gray-500 text-sm">
                No votes yet — be the first.
              </p>
            ) : (
              <ul className="space-y-1 text-sm text-gray-600">
                {votes.map((vote) => (
                  <li key={`${vote.target_id}-${vote.voter_uid}`}>
                    <code>{vote.voter_uid}</code> voted{" "}
                    <strong>{vote.vote_weight}</strong>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="p-6 bg-white shadow-lg rounded-lg">
            <h2 className="text-xl font-bold mb-4">Cast your vote</h2>

            {!address ? (
              <div>
                <p className="text-gray-600 mb-4">
                  Connect a wallet to vote with your quadratic credit budget.
                </p>
                <ConnectWalletButton />
              </div>
            ) : (
              <div>
                <div className="mb-4 space-y-1 text-gray-700">
                  <p>
                    Voting as <code className="text-sm">{address}</code>
                  </p>
                  {credits && (
                    <p className="text-sm">
                      Budget <strong>{credits.budget}</strong> · spent{" "}
                      <strong>{credits.spent}</strong> · remaining{" "}
                      <strong>{credits.remaining}</strong>
                    </p>
                  )}
                </div>

                {voteError && (
                  <p
                    role="alert"
                    className="mb-4 p-3 bg-red-50 text-red-800 rounded-lg"
                  >
                    {voteError}
                  </p>
                )}

                {credits && credits.remaining === 0 ? (
                  <p className="text-gray-600">
                    You have spent your entire voting budget.
                  </p>
                ) : (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      void handleVote();
                    }}
                  >
                    <label className="block">
                      <span className="block text-sm font-medium text-gray-700 mb-1">
                        Vote weight (0–{maxWeight})
                      </span>
                      <input
                        type="number"
                        min="0"
                        max={maxWeight}
                        value={weight}
                        onChange={(e) => setWeight(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        aria-label="Vote weight"
                      />
                    </label>
                    {cost !== null && credits && (
                      <p className="text-sm text-gray-600 mt-2">
                        Costs <strong>{cost}</strong> credits;{" "}
                        <strong>{remainingAfter}</strong> left after voting.
                      </p>
                    )}
                    <button
                      type="submit"
                      disabled={voting}
                      className="mt-4 px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {voting ? "Casting…" : "Cast vote"}
                    </button>
                  </form>
                )}
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
