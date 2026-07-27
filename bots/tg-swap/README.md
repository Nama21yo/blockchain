# Fetch

Fetch is a Telegram-inspired, non-custodial Solana swap app. It swaps curated pairs of SOL, BONK, and USDC through Jupiter Swap V2 while keeping the interface code separate from token math, wallet signing, and server-side API access.

## What is implemented

- Svelte 5, SvelteKit, TypeScript, Tailwind CSS 4, and Bun
- Responsive desktop and mobile swap experience
- Phantom and Solflare wallet adapters
- Decimal-safe SOL, BONK, and USDC amount conversion
- Debounced quote previews without stale transactions
- Fresh Jupiter `/swap/v2/order` creation when the user confirms
- Browser-wallet signing of Solana v0 transactions
- Jupiter `/swap/v2/execute` managed landing and confirmation
- Router, fee, expected output, and price-impact receipt
- Transaction phase feedback and Solscan success link
- Server-side API-key boundary and request validation
- Unit tests for amount conversion and public API validation

## Requirements

- [Bun](https://bun.sh/) 1.3 or newer
- A Jupiter API key from [developers.jup.ag/portal](https://developers.jup.ag/portal)
- Phantom or Solflare in the browser
- A funded **Solana mainnet** wallet for an end-to-end swap

Jupiter routes mainnet liquidity. Devnet tokens cannot be used for a real swap in this app.

## Run locally

```bash
cd bots/tg-swap
cp .env.example .env
```

Set the server-only key in `.env`:

```dotenv
JUPITER_API_KEY=your_jupiter_api_key
```

Install and start:

```bash
bun install
bun run dev
```

Open the local URL shown by Vite. A quote appears after a valid amount is entered. Connecting a wallet is only required when building and signing the executable order.

## Verify

```bash
bun run check
bun run test
bun run build
```

The unit suite does not submit transactions or change blockchain state. A real mainnet swap is intentionally not part of automated verification.

## How a swap works

```text
Amount entered
  -> convert to atomic units with integer-string math
  -> GET /api/jupiter/order without taker (price preview)
  -> user selects Swap
  -> GET /api/jupiter/order with wallet as taker (fresh v0 transaction)
  -> Phantom or Solflare signs in the browser
  -> POST /api/jupiter/execute with signed bytes and requestId
  -> require status: Success
  -> show Solscan receipt
```

The preview and executable order are separate on purpose. Jupiter orders have block-height or RFQ expiry limits, so signing a transaction prepared during an earlier preview would increase stale-quote failures.

Jupiter Swap V2's meta-aggregator is used without manual slippage overrides. This keeps all eligible routers available and lets Jupiter handle its real-time slippage estimator, priority-fee strategy, broadcast, and confirmation pipeline.

## Project structure

```text
src/
  lib/
    components/       Svelte presentation components
    domain/           curated token registry and exact amount conversion
    jupiter/          browser API client, response types, signing orchestration
    server/           private Jupiter client and request validation
    wallet/           wallet adapter construction and display helpers
  routes/
    api/jupiter/      same-origin order and execute endpoints
    +page.svelte      page composition and UI state
docs/
  IMPLEMENTATION_PLAN.md
  JUPITER_INTEGRATION.md
```

See [JUPITER_INTEGRATION.md](docs/JUPITER_INTEGRATION.md) for the detailed Web3 lifecycle and security boundary. See [IMPLEMENTATION_PLAN.md](docs/IMPLEMENTATION_PLAN.md) for scope and delivery decisions.

## Security notes

- Never place `JUPITER_API_KEY` in a public environment variable.
- Never enter a seed phrase or private key into Fetch.
- Read the wallet transaction before approving it.
- Start with a deliberately small mainnet amount.
- An HTTP response is not proof of execution; Fetch only reports success for Jupiter's `status: "Success"` result.

## Current boundaries

This first release is a web app in the `tg-swap` project, not a deployed Telegram Mini App or conversational Telegram bot backend. It does not offer token search, limit orders, DCA, custom slippage, referral fees, liquidity creation, or custody. Those can be added as separate, reviewable milestones after the core swap flow is proven with a small mainnet transaction.
