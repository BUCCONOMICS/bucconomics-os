import { MockWalletProvider } from "../src/index.js";

function createMemoryStorage(): Storage {
  const store = new Map<string, string>();
  return {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => void store.set(key, value),
    removeItem: (key: string) => void store.delete(key),
    clear: () => store.clear(),
    key: (index: number) => Array.from(store.keys())[index] ?? null,
    get length() {
      return store.size;
    },
  };
}

describe("MockWalletProvider", () => {
  it("connects and produces a valid-looking address", async () => {
    const wallet = new MockWalletProvider(createMemoryStorage());
    const account = await wallet.connect();

    expect(account.address).toMatch(/^0x[0-9a-f]{40}$/);
    expect(wallet.getAddress()).toBe(account.address);
    expect(wallet.isConnected()).toBe(true);
  });

  it("persists the account across instances", async () => {
    const storage = createMemoryStorage();
    const first = new MockWalletProvider(storage);
    const account = await first.connect();

    const second = new MockWalletProvider(storage);
    expect(second.getAddress()).toBe(account.address);
    expect(second.isConnected()).toBe(true);
  });

  it("disconnect clears the account and storage", async () => {
    const storage = createMemoryStorage();
    const wallet = new MockWalletProvider(storage);
    await wallet.connect();

    await wallet.disconnect();

    expect(wallet.isConnected()).toBe(false);
    expect(wallet.getAddress()).toBeNull();
    expect(new MockWalletProvider(storage).isConnected()).toBe(false);
  });
});
