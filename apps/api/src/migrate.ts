import { migrateToLatest } from "@repo/db";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is required");
}

await migrateToLatest({ connectionString: databaseUrl });
console.log("Migrations up to date");
