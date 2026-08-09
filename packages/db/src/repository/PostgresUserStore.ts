import { Kysely, PostgresDialect } from "kysely";
import type { Pool } from "pg";
import type { Selectable } from "kysely";
import type { IUserStore, UserIdentity } from "@repo/interfaces";
import type { Database } from "../schema/database.js";
import type { UserTable } from "../schema/tables.js";

export class PostgresUserStore implements IUserStore {
  constructor(private readonly db: Kysely<Database>) {}

  static fromPool(pool: Pool): PostgresUserStore {
    const db = new Kysely<Database>({
      dialect: new PostgresDialect({ pool }),
    });
    return new PostgresUserStore(db);
  }

  async getUser(user_uid: string): Promise<UserIdentity | null> {
    const row = await this.db
      .selectFrom("users")
      .selectAll()
      .where("user_uid", "=", user_uid)
      .executeTakeFirst();
    return row ? mapUserRow(row) : null;
  }

  async recordKycPassed(input: {
    user_uid: string;
    risk_band: UserIdentity["risk_band"];
    cooling_off_ends_at: Date;
  }): Promise<UserIdentity> {
    const row = await this.db
      .insertInto("users")
      .values({
        user_uid: input.user_uid,
        kyc_status: "passed",
        risk_band: input.risk_band,
        cooling_off_ends_at: input.cooling_off_ends_at,
      })
      .onConflict((oc) =>
        oc.column("user_uid").doUpdateSet({
          kyc_status: "passed",
          risk_band: input.risk_band,
          cooling_off_ends_at: input.cooling_off_ends_at,
          updated_at: new Date(),
        }),
      )
      .returningAll()
      .executeTakeFirstOrThrow();
    return mapUserRow(row);
  }

  async markUidMinted(
    user_uid: string,
    token_id: string,
  ): Promise<UserIdentity | null> {
    const row = await this.db
      .updateTable("users")
      .set({
        minted_uid_token_id: token_id,
        minted_at: new Date(),
        updated_at: new Date(),
      })
      .where("user_uid", "=", user_uid)
      .returningAll()
      .executeTakeFirst();
    return row ? mapUserRow(row) : null;
  }
}

function mapUserRow(row: Selectable<UserTable>): UserIdentity {
  return {
    user_uid: row.user_uid,
    kyc_status: row.kyc_status,
    risk_band: row.risk_band,
    cooling_off_ends_at: row.cooling_off_ends_at,
    minted_uid_token_id: row.minted_uid_token_id,
    minted_at: row.minted_at,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}
