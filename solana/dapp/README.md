# Solana Devnet Dashboard

A Svelte 5 dApp for connecting a Phantom or Solflare wallet and working with
Solana Devnet.

Features:

- View the connected wallet balance and request test SOL
- Sign and locally verify messages
- Send native SOL
- Discover and transfer legacy SPL Token and Token-2022 assets
- Read Token-2022 and legacy Metaplex metadata when available
- Generate Solana Pay transfer URLs and QR codes

## Run Locally

```bash
pnpm install
pnpm run dev -- --open
```

The connected wallet must be set to Solana Devnet. Public Devnet RPC endpoints
can rate-limit airdrop requests.

To use Alchemy for all RPC requests, create `.env` from `.env.example` and set
`PUBLIC_SOLANA_RPC_URL` to the Alchemy Devnet endpoint. The dashboard sends
Alchemy's documented three-parameter `requestAirdrop` payload, including the
`processed` commitment configuration.

## Verify

```bash
pnpm run check
pnpm run build
```
