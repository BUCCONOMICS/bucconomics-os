import type { Address } from "../types";

/**
 * A connected ERC-4337 smart account. `address` is the account address;
 * `handle` is an opaque reference to the underlying SDK account object,
 * kept untyped so no vendor SDK leaks through the interface.
 */
export interface SmartAccount {
  address: Address;
  handle: unknown;
}

/**
 * Vendor-agnostic wallet/account abstraction. Concrete implementations
 * (Web3Auth, ZeroDev, a mock, etc.) live outside this package and must
 * never appear in consumer imports. The web app talks only to this.
 */
export interface IWalletProvider {
  /** Initialise and connect a smart account, returning the connected account. */
  connect(): Promise<SmartAccount>;
  /** Tear down the session. Safe to call when already disconnected. */
  disconnect(): Promise<void>;
  /** The current smart account address, or null when disconnected. */
  getAddress(): Address | null;
  /** Whether a smart account is currently connected. */
  isConnected(): boolean;
}
