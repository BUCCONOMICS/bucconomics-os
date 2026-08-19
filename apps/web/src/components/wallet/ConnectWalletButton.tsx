"use client";

import { useState } from "react";

import { useSmartAccount } from "../../store/walletStore";

export function ConnectWalletButton() {
  const { address, connect, disconnect } = useSmartAccount();
  const [pending, setPending] = useState(false);

  async function run(action: () => Promise<void>): Promise<void> {
    setPending(true);
    try {
      await action();
    } finally {
      setPending(false);
    }
  }

  if (!address) {
    return (
      <button
        type="button"
        disabled={pending}
        onClick={() => void run(connect)}
        className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {pending ? "Connecting..." : "Connect Wallet"}
      </button>
    );
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <p className="text-sm text-gray-600">
        Connected as <code className="text-gray-900">{address}</code>
      </p>
      <button
        type="button"
        disabled={pending}
        onClick={() => void run(disconnect)}
        className="px-4 py-2 bg-gray-200 text-gray-800 font-semibold rounded-lg hover:bg-gray-300 transition disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {pending ? "Disconnecting..." : "Disconnect"}
      </button>
    </div>
  );
}
