import type { Address, IWalletProvider, SmartAccount } from "@repo/interfaces";

const STORAGE_KEY = "bucc.mock.smartAccount";

/** Returns the browser localStorage when available, otherwise null. */
function getStorage(): Storage | null {
  if (typeof window === "undefined" || !window.localStorage) {
    return null;
  }
  return window.localStorage;
}

/** Generates a random 0x-prefixed address. Purely cosmetic for the mock. */
function generateAddress(): Address {
  const hex = Array.from({ length: 40 }, () =>
    Math.floor(Math.random() * 16).toString(16),
  ).join("");
  return `0x${hex}`;
}

/**
 * Browser-only mock of a connected ERC-4337 smart account. Produces a
 * cosmetic address and persists it across refreshes. Swapping this for a
 * real vendor provider (Web3Auth, ZeroDev, ...) must not change any
 * consumer code: they only ever talk to `IWalletProvider`.
 */
export class MockWalletProvider implements IWalletProvider {
  private account: SmartAccount | null = null;
  private readonly storage: Storage | null;

  constructor(storage: Storage | null = getStorage()) {
    this.storage = storage;
    const stored = storage?.getItem(STORAGE_KEY);
    if (stored) {
      try {
        this.account = JSON.parse(stored) as SmartAccount;
      } catch {
        this.account = null;
      }
    }
  }

  async connect(): Promise<SmartAccount> {
    if (this.account) {
      return this.account;
    }
    const account: SmartAccount = {
      address: generateAddress(),
      handle: { mock: true, createdAt: new Date().toISOString() },
    };
    this.account = account;
    this.storage?.setItem(STORAGE_KEY, JSON.stringify(account));
    return account;
  }

  async disconnect(): Promise<void> {
    this.account = null;
    this.storage?.removeItem(STORAGE_KEY);
  }

  getAddress(): Address | null {
    return this.account?.address ?? null;
  }

  isConnected(): boolean {
    return this.account !== null;
  }
}
