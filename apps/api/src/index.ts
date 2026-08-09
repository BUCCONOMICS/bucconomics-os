import { PostgresProposalStore } from "@repo/db";
import { Pool } from "pg";
import { createServer } from "./server.js";

const port = Number(process.env.PORT ?? 3001);
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is required");
}

const pool = new Pool({ connectionString: databaseUrl });
const store = PostgresProposalStore.fromPool(pool);

const app = await createServer({ store, logger: true });

async function shutdown(): Promise<void> {
  await app.close();
  await pool.end();
  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

await app.listen({ port, host: "0.0.0.0" });
console.log(`API listening on http://0.0.0.0:${port}`);
