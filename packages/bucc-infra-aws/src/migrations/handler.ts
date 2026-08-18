import {
  GetSecretValueCommand,
  SecretsManagerClient,
} from "@aws-sdk/client-secrets-manager";
import { migrateToLatest } from "@repo/db/migrations";

interface MigrationEvent {
  readonly secretArn: string;
  readonly endpoint: string;
  readonly dbName: string;
}

interface SecretPayload {
  readonly username: string;
  readonly password: string;
}

export async function handler(event: MigrationEvent): Promise<void> {
  const result = await new SecretsManagerClient({}).send(
    new GetSecretValueCommand({ SecretId: event.secretArn }),
  );
  const secret = parseSecret(result.SecretString);

  await migrateToLatest({
    host: event.endpoint,
    port: 5432,
    database: event.dbName,
    user: secret.username,
    password: secret.password,
    ssl: { rejectUnauthorized: true },
  });
}

function parseSecret(secretString: string | undefined): SecretPayload {
  if (!secretString) {
    throw new Error("RDS credential secret has no string value");
  }
  const value: unknown = JSON.parse(secretString);
  if (!value || typeof value !== "object") {
    throw new Error("RDS credential secret is invalid");
  }
  const record = value as Record<string, unknown>;
  if (
    typeof record.username !== "string" ||
    typeof record.password !== "string"
  ) {
    throw new Error("RDS credential secret lacks username or password");
  }
  return { username: record.username, password: record.password };
}
