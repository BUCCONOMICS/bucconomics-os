import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import type { Address, IWalletProvider } from "@repo/interfaces";

import { useSmartAccount } from "../../store/walletStore";
import { ConnectWalletButton } from "./ConnectWalletButton";
import { WalletProvider } from "./WalletProvider";

const address: Address = "0xabc123";

function createProvider(initialAddress: Address | null = null) {
  let currentAddress = initialAddress;
  const provider: IWalletProvider = {
    connect: jest.fn(async () => {
      currentAddress = address;
      return { address, handle: { mock: true } };
    }),
    disconnect: jest.fn(async () => {
      currentAddress = null;
    }),
    getAddress: () => currentAddress,
    isConnected: () => currentAddress !== null,
  };
  return provider;
}

function AddressDisplay({ label }: { readonly label: string }) {
  const { address: currentAddress } = useSmartAccount();
  return <output aria-label={label}>{currentAddress ?? "disconnected"}</output>;
}

describe("WalletProvider", () => {
  it("shares connect and disconnect state with every consumer", async () => {
    const provider = createProvider();
    render(
      <WalletProvider provider={provider}>
        <ConnectWalletButton />
        <AddressDisplay label="first consumer" />
        <AddressDisplay label="second consumer" />
      </WalletProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Connect Wallet" }));

    await waitFor(() => {
      expect(screen.getByLabelText("first consumer")).toHaveTextContent(
        address,
      );
      expect(screen.getByLabelText("second consumer")).toHaveTextContent(
        address,
      );
    });
    expect(provider.connect).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole("button", { name: "Disconnect" }));

    await waitFor(() => {
      expect(screen.getByLabelText("first consumer")).toHaveTextContent(
        "disconnected",
      );
      expect(
        screen.getByRole("button", { name: "Connect Wallet" }),
      ).toBeInTheDocument();
    });
    expect(provider.disconnect).toHaveBeenCalledTimes(1);
  });

  it("restores an existing provider address", async () => {
    render(
      <WalletProvider provider={createProvider(address)}>
        <AddressDisplay label="account" />
      </WalletProvider>,
    );

    await waitFor(() => {
      expect(screen.getByLabelText("account")).toHaveTextContent(address);
    });
  });

  it("rejects consumers outside WalletProvider", () => {
    expect(() => render(<AddressDisplay label="account" />)).toThrow(
      "useSmartAccount must be used within WalletProvider",
    );
  });
});
