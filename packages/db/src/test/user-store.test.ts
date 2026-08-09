import {
  jest,
  describe,
  beforeAll,
  afterAll,
  beforeEach,
  it,
  expect,
} from "@jest/globals";
import { PostgresUserStore } from "../repository/PostgresUserStore.js";
import { setupTestDb, type TestDb } from "./helpers.js";

jest.setTimeout(120_000);

describe("PostgresUserStore", () => {
  let testDb: TestDb;

  beforeAll(async () => {
    testDb = await setupTestDb();
  });

  afterAll(async () => {
    await testDb.teardown();
  });

  beforeEach(async () => {
    await testDb.reset();
  });

  it("returns null for an unknown user", async () => {
    const store = new PostgresUserStore(testDb.db);
    expect(await store.getUser("uid-unknown")).toBeNull();
  });

  it("creates a user on a passed KYC event", async () => {
    const store = new PostgresUserStore(testDb.db);
    const endsAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const user = await store.recordKycPassed({
      user_uid: "uid-alice",
      risk_band: "MEDIUM",
      cooling_off_ends_at: endsAt,
    });

    expect(user.user_uid).toBe("uid-alice");
    expect(user.kyc_status).toBe("passed");
    expect(user.risk_band).toBe("MEDIUM");
    expect(user.cooling_off_ends_at).toEqual(endsAt);
  });

  it("retrieves a previously recorded user", async () => {
    const store = new PostgresUserStore(testDb.db);
    const endsAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await store.recordKycPassed({
      user_uid: "uid-bob",
      risk_band: "LOW",
      cooling_off_ends_at: endsAt,
    });

    const user = await store.getUser("uid-bob");
    expect(user?.kyc_status).toBe("passed");
    expect(user?.risk_band).toBe("LOW");
    expect(user?.cooling_off_ends_at).toEqual(endsAt);
  });

  it("overwrites status, band and cooling-off window on a re-event", async () => {
    const store = new PostgresUserStore(testDb.db);

    await store.recordKycPassed({
      user_uid: "uid-bob",
      risk_band: "LOW",
      cooling_off_ends_at: new Date(Date.now() + 24 * 60 * 60 * 1000),
    });

    const later = new Date(Date.now() + 48 * 60 * 60 * 1000);
    const updated = await store.recordKycPassed({
      user_uid: "uid-bob",
      risk_band: "HIGH",
      cooling_off_ends_at: later,
    });

    expect(updated.risk_band).toBe("HIGH");
    expect(updated.cooling_off_ends_at).toEqual(later);
    expect(updated.kyc_status).toBe("passed");
  });

  it("starts with no minted UID", async () => {
    const store = new PostgresUserStore(testDb.db);
    await store.recordKycPassed({
      user_uid: "uid-mint",
      risk_band: "LOW",
      cooling_off_ends_at: new Date(Date.now() + 24 * 60 * 60 * 1000),
    });

    const user = await store.getUser("uid-mint");
    expect(user?.minted_uid_token_id).toBeNull();
    expect(user?.minted_at).toBeNull();
  });

  it("records an on-chain UID mint", async () => {
    const store = new PostgresUserStore(testDb.db);
    await store.recordKycPassed({
      user_uid: "uid-mint",
      risk_band: "LOW",
      cooling_off_ends_at: new Date(Date.now() + 24 * 60 * 60 * 1000),
    });

    const updated = await store.markUidMinted("uid-mint", "42");

    expect(updated?.minted_uid_token_id).toBe("42");
    expect(updated?.minted_at).not.toBeNull();
  });

  it("returns null when marking a mint for an unknown user", async () => {
    const store = new PostgresUserStore(testDb.db);
    expect(await store.markUidMinted("uid-missing", "42")).toBeNull();
  });
});
