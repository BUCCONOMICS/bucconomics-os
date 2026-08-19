"use client";

import { useEffect, useState } from "react";
import type { Address, IWalletProvider } from "@repo/interfaces";
import { MockWalletProvider } from "@repo/wallet";

import { WalletContext } from "../../store/walletStore";

export function WalletProvider({
  children,
  provider,
}: {
  readonly children: React.ReactNode;
  readonly provider?: IWalletProvider;
}) {
  const [walletProvider] = useState<IWalletProvider>(
    () => provider ?? new MockWalletProvider(),
  );
  const [address, setAddress] = useState<Address | null>(null);

  useEffect(() => {
    setAddress(walletProvider.getAddress());
  }, [walletProvider]);

  async function connect(): Promise<void> {
    const account = await walletProvider.connect();
    setAddress(account.address);
  }

  async function disconnect(): Promise<void> {
    await walletProvider.disconnect();
    setAddress(null);
  }

  return (
    <WalletContext value={{ address, connect, disconnect }}>
      {children}
    </WalletContext>
  );
}
