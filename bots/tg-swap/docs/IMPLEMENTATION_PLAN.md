# Fetch implementation plan

## Product boundary

Fetch is a mainnet Solana web app with a Telegram-inspired interaction model. Its first release supports curated swaps between SOL, BONK, and USDC. It is non-custodial: the browser wallet signs every swap and no private key reaches the application server.

This release does not create tokens, seed liquidity, run a Telegram bot backend, provide limit orders, or promise token delivery based only on an HTTP response.

## Architecture

```text
Svelte swap UI
  -> typed client swap controller
  -> SvelteKit /api/jupiter routes (API key boundary)
  -> Jupiter Swap V2 /order and /execute
  -> connected Solana wallet signs the v0 transaction
```

The quote preview calls `/order` without a `taker`, so Jupiter returns pricing without a transaction. Clicking Swap refreshes the order with the connected wallet as `taker`, signs the fresh versioned transaction immediately, and passes the signed bytes plus `requestId` to `/execute` for managed landing and confirmation.

## Delivery slices

1. Svelte 5, Tailwind 4, TypeScript, Bun, visual tokens, and responsive shell.
2. Typed token amounts, Jupiter server proxy, wallet adapter, transaction signing, and tests.
3. Swap ticket, token controls, debounced quote receipt, wallet and execution states, errors, and Solscan receipt.
4. Setup and lifecycle documentation plus full check, test, and production-build verification.

## Safety decisions

- Keep `JUPITER_API_KEY` server-only.
- Use Jupiter's maintained Swap V2 meta-aggregator and do not override slippage, preserving RTSE and all eligible routers.
- Rebuild immediately before signing because order transactions expire.
- Treat only `/execute` `status: "Success"` as a successful swap.
- Label the app mainnet-only and never suggest devnet funds can be swapped through Jupiter.
- Never store or request a seed phrase or private key.
