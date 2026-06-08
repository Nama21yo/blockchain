# Solana Devnet Faucet

A Svelte 5 dApp for connecting a Phantom or Solflare wallet, viewing its Devnet
balance, and requesting 1 test SOL.

## Run Locally

```bash
pnpm install
pnpm run dev -- --open
```

The connected wallet must be set to Solana Devnet. Public Devnet RPC endpoints
can rate-limit airdrop requests.

## Verify

```bash
pnpm run check
pnpm run build
```
