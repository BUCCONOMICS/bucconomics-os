## Foundry

**Foundry is a blazing fast, portable and modular toolkit for Ethereum application development written in Rust.**

Foundry consists of:

- **Forge**: Ethereum testing framework (like Truffle, Hardhat and DappTools).
- **Cast**: Swiss army knife for interacting with EVM smart contracts, sending transactions and getting chain data.
- **Anvil**: Local Ethereum node, akin to Ganache, Hardhat Network.
- **Chisel**: Fast, utilitarian, and verbose solidity REPL.

## Documentation

https://book.getfoundry.sh/

## Usage

### Build

```shell
$ forge build
```

### Test

```shell
$ forge test
```

### Format

```shell
$ forge fmt
```

### Gas Snapshots

```shell
$ forge snapshot
```

### Anvil

```shell
$ anvil
```

### Deploy

```shell
$ forge script script/Counter.s.sol:CounterScript --rpc-url <your_rpc_url> --private-key <your_private_key>
```

### Mint a UID (server-side mint)

Mints one soul-bound BUCC_UID to a recipient, signed by the contract owner.
Used by the API's `POST /mint` endpoint after the KYC cooling-off has elapsed:

```shell
$ BUCC_UID_ADDRESS=<addr> MINT_RECIPIENT=<0x...> forge script \
    script/MintUid.s.sol --rpc-url http://localhost:8545 \
    --private-key <owner-key> --broadcast
```

The script logs `tokenId=<id>`, which the API parses to record the mint.

### Cast

```shell
$ cast <subcommand>
```

### Help

```shell
$ forge --help
$ anvil --help
$ cast --help
```
