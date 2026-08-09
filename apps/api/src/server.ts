import Fastify, { type FastifyInstance, type FastifyReply } from "fastify";
import type { IProposalStore } from "@repo/interfaces";
import {
  DuplicateVoteError,
  ValidationError,
  validateCreateProposalInput,
  validateCreateVoteInput,
} from "@repo/db";
import { ZodError } from "zod";

export interface ApiOptions {
  store: IProposalStore;
  logger?: boolean;
}

/** Builds the proposal/vote HTTP API around an IProposalStore. */
export async function createServer({
  store,
  logger = false,
}: ApiOptions): Promise<FastifyInstance> {
  const app = Fastify({ logger });

  app.get("/health", async () => ({ status: "ok" }));

  app.post("/proposals", async (request, reply) => {
    const input = validateCreateProposalInput(request.body);
    const proposal = await store.createProposal(input);
    return reply.code(201).send(proposal);
  });

  app.get<{ Querystring: { buccId?: string } }>(
    "/proposals",
    async (request, reply) => {
      const { buccId } = request.query;
      if (!buccId) {
        return reply
          .code(400)
          .send({ error: "buccId query parameter is required" });
      }
      const proposals = await store.listProposalsByBucc(buccId);
      return proposals;
    },
  );

  app.get<{ Params: { id: string } }>(
    "/proposals/:id",
    async (request, reply) => {
      const proposal = await store.getProposal(request.params.id);
      if (!proposal) {
        return reply
          .code(404)
          .send({ error: `Proposal not found: ${request.params.id}` });
      }
      return proposal;
    },
  );

  app.get<{ Params: { id: string } }>(
    "/proposals/:id/votes",
    async (request) => {
      const votes = await store.listVotesByProposal(request.params.id);
      return votes;
    },
  );

  app.post("/votes", async (request, reply) => {
    const input = validateCreateVoteInput(request.body);
    const vote = await store.createVote(input);
    return reply.code(201).send(vote);
  });

  app.setErrorHandler((error, request, reply) => {
    if (error instanceof ValidationError) {
      return sendValidationError(reply, error.message, error.field);
    }
    if (error instanceof ZodError) {
      return sendValidationError(reply, "validation_failed", undefined, {
        issues: error.issues.map((issue) => ({
          path: issue.path.join("."),
          message: issue.message,
        })),
      });
    }
    if (error instanceof DuplicateVoteError) {
      return reply.code(409).send({ error: error.message });
    }
    request.log.error(error);
    return reply.code(500).send({ error: "internal_error" });
  });

  return app;
}

function sendValidationError(
  reply: FastifyReply,
  error: string,
  field?: string,
  extra?: Record<string, unknown>,
): FastifyReply {
  return reply.code(400).send({
    error,
    ...(field ? { field } : {}),
    ...(extra ? extra : {}),
  });
}
