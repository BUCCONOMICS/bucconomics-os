export interface IWalletProvider {
  /** Connects social login or standard wallet. Returns the Smart Account address. */
  connectWallet(): Promise<string>;

  /** Signs and executes a transaction on behalf of the user. */
  signTransaction(txData: unknown): Promise<string>;

  /** Routes the transaction through an ERC-4337 Paymaster for gasless UX. */
  sponsorGas(txData: unknown): Promise<string>;
}
