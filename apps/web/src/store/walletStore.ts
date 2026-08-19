import { createContext, useContext } from "react";
import type { Address } from "@repo/interfaces";

export interface WalletContextValue {
  readonly address: Address | null;
  connect(): Promise<void>;
  disconnect(): Promise<void>;
}

export const WalletContext = createContext<WalletContextValue | undefined>(
  undefined,
);

export function useSmartAccount(): WalletContextValue {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error("useSmartAccount must be used within WalletProvider");
  }
  return context;
}
