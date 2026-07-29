export class ValidationError extends Error {
  public readonly field: string | undefined;

  constructor(message: string, options?: { readonly field?: string }) {
    super(message);
    this.name = "ValidationError";
    this.field = options?.field;
  }
}

export class DuplicateVoteError extends Error {
  constructor(
    public readonly target_id: string,
    public readonly voter_uid: string,
  ) {
    super(
      `Duplicate vote: voter ${voter_uid} already voted on proposal ${target_id}`,
    );
    this.name = "DuplicateVoteError";
  }
}

export class ProposalNotFoundError extends Error {
  constructor(public readonly proposal_id: string) {
    super(`Proposal not found: ${proposal_id}`);
    this.name = "ProposalNotFoundError";
  }
}
