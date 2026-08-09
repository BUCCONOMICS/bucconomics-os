import Fastify, { type FastifyInstance, type FastifyReply } from "fastify";
import type { IProposalStore, IUserStore } from "@repo/interfaces";
import {
  DuplicateVoteError,
  ValidationError,
  validateCreateProposalInput,
  validateCreateVoteInput,
  validateKycWebhookEvent,
} from "@repo/db";
import { ZodError } from "zod";

export interface ApiOptions {
  store: IProposalStore;
  userStore: IUserStore;
  logger?: boolean;
}

/** Builds the proposal/vote and KYC HTTP API around the injected stores. */
export async function createServer({
  store,
  userStore,
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

  app.post("/webhooks/kyc", async (request, reply) => {
    const event = validateKycWebhookEvent(request.body);

    if (event.status !== "passed") {
      return reply.code(202).send({
        status: "ignored",
        reason: `status ${event.status} requires no action`,
      });
    }

    const coolingOffHours = Number(process.env.KYC_COOLING_OFF_HOURS ?? "24");
    const cooling_off_ends_at = new Date(
      Date.now() + coolingOffHours * 60 * 60 * 1000,
    );

    const user = await userStore.recordKycPassed({
      user_uid: event.user_uid,
      risk_band: event.risk_band ?? "PENDING",
      cooling_off_ends_at,
    });

    return reply.code(202).send({
      status: "accepted",
      user_uid: user.user_uid,
      cooling_off_ends_at: user.cooling_off_ends_at,
    });
  });

  app.get<{ Params: { uid: string } }>(
    "/users/:uid",
    async (request, reply) => {
      const user = await userStore.getUser(request.params.uid);
      if (!user) {
        return reply
          .code(404)
          .send({ error: `User not found: ${request.params.uid}` });
      }
      const coolingOffComplete =
        user.cooling_off_ends_at !== null &&
        user.cooling_off_ends_at.getTime() <= Date.now();
      const can_mint = user.kyc_status === "passed" && coolingOffComplete;
      return { ...user, cooling_off_complete: coolingOffComplete, can_mint };
    },
  );

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
