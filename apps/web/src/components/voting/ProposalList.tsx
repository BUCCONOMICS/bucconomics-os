"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { listProposals, type Proposal } from "../../lib/api";

export function ProposalList({ buccId }: { buccId: string }) {
  const [proposals, setProposals] = useState<Proposal[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setError(null);
    setProposals(null);
    listProposals(buccId)
      .then((data) => {
        if (!cancelled) setProposals(data);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Failed to load proposals",
          );
        }
      });
    return () => {
      cancelled = true;
    };
  }, [buccId]);

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-2">Community proposals</h1>
      <p className="text-gray-600 mb-6">
        Vote with your quadratic budget: casting weight <code>w</code> costs{" "}
        <code>w&sup2;</code> credits.
      </p>

      {error && (
        <p role="alert" className="mb-4 p-3 bg-red-50 text-red-800 rounded-lg">
          Failed to load proposals: {error}
        </p>
      )}

      {!error && proposals === null && (
        <p role="status" className="text-gray-600">
          Loading proposals…
        </p>
      )}

      {!error && proposals !== null && proposals.length === 0 && (
        <p className="text-gray-600">
          No proposals for this community yet. Create one via the API (
          <code>POST /proposals</code>).
        </p>
      )}

      {proposals?.map((proposal) => (
        <div key={proposal.proposal_id} className="mb-4">
          <Link
            href={`/proposals/${proposal.proposal_id}`}
            className="block p-4 bg-white shadow-lg rounded-lg hover:bg-gray-50 transition"
          >
            <h2 className="text-xl font-semibold text-gray-900">
              {proposal.title}
            </h2>
            <p className="text-gray-600 mt-1 line-clamp-2">{proposal.body}</p>
            <p className="text-sm text-gray-500 mt-2">
              {proposal.type} · {proposal.tags.join(", ") || "no tags"}
            </p>
          </Link>
        </div>
      ))}
    </div>
  );
}
