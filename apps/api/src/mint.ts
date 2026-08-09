import { execFile } from "node:child_process";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

/** Raised when an on-chain UID mint cannot be completed. */
export class MintUidError extends Error {
  constructor(message: string, options?: { readonly cause?: unknown }) {
    super(message, options);
    this.name = "MintUidError";
  }
}

export interface MintedUid {
  tokenId: string;
}

/** Abstraction over the on-chain UID mint, injected into the HTTP server. */
export interface UidMinter {
  mintUid(recipient: string): Promise<MintedUid>;
}

const CONTRACTS_DIR = fileURLToPath(
  new URL("../../../contracts", import.meta.url),
);

/**
 * Mints via the `MintUid` forge script, signed by the BUCC_UID owner key.
 * The BUCC_UID contract is owner-mint-only, so the server holds the owner key
 * and the script is the bridge to the chain. Expects BUCC_UID_ADDRESS and
 * MINT_OWNER_KEY (and optionally MINT_RPC_URL, defaulting to anvil).
 */
export class ForgeUidMinter implements UidMinter {
  constructor(
    private readonly options: {
      scriptPath?: string;
      rpcUrl?: string;
      contractAddress?: string;
      ownerKey?: string;
    } = {},
  ) {}

  async mintUid(recipient: string): Promise<MintedUid> {
    const scriptPath = this.options.scriptPath ?? "script/MintUid.s.sol";
    const rpcUrl =
      this.options.rpcUrl ??
      process.env.MINT_RPC_URL ??
      "http://localhost:8545";
    const contractAddress =
      this.options.contractAddress ?? process.env.BUCC_UID_ADDRESS;
    const ownerKey = this.options.ownerKey ?? process.env.MINT_OWNER_KEY;

    if (!contractAddress) {
      throw new MintUidError("BUCC_UID_ADDRESS is required to mint a UID");
    }
    if (!ownerKey) {
      throw new MintUidError("MINT_OWNER_KEY is required to mint a UID");
    }

    let stdout: string;
    try {
      const result = await execFileAsync(
        "forge",
        [
          "script",
          scriptPath,
          "--rpc-url",
          rpcUrl,
          "--private-key",
          ownerKey,
          "--broadcast",
        ],
        {
          cwd: CONTRACTS_DIR,
          env: {
            ...process.env,
            BUCC_UID_ADDRESS: contractAddress,
            MINT_RECIPIENT: recipient,
          },
          maxBuffer: 10 * 1024 * 1024,
        },
      );
      stdout = result.stdout;
    } catch (error) {
      throw new MintUidError("forge mint script failed", { cause: error });
    }

    const match = stdout.match(/tokenId=\s*(\d+)/);
    if (!match?.[1]) {
      throw new MintUidError("forge mint script did not report a token id");
    }
    return { tokenId: match[1] };
  }
}
