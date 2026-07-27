# Jupiter Swap V2 integration

## Why Swap V2

The URL originally supplied for Jupiter's Swap API now returns 404, and the Metis `/swap/v1` API is explicitly marked as no longer actively maintained. Fetch uses the maintained Swap V2 meta-aggregator at `https://api.jup.ag/swap/v2`.

The meta-aggregator lets Metis, JupiterZ, Dflow, and OKX compete for an order. Jupiter then handles real-time slippage estimation, priority-fee strategy, transaction broadcasting, and confirmation through `/execute`. Fetch deliberately does not set optional slippage overrides, because doing so changes the order to manual mode and can restrict routing.

## Request lifecycle

### 1. Preview a quote

The browser converts the typed decimal amount into an integer string using the token's decimals. No JavaScript floating-point arithmetic is used. It then requests:

```text
GET /api/jupiter/order?inputMint=...&outputMint=...&amount=...
```

The SvelteKit server validates the curated mints and positive atomic amount, attaches the server-only `JUPITER_API_KEY`, and forwards the request to `GET /swap/v2/order`. Because there is no `taker`, Jupiter returns pricing but no transaction. This preview can safely expire without leaving a stale transaction in the browser.

### 2. Build a fresh order

When the user confirms, Fetch repeats the order request with the connected public key as `taker`. Jupiter returns a base64-encoded v0 transaction and `requestId`. Fetch rejects quote-only responses or orders that contain an error instead of a transaction.

### 3. Sign in the wallet

The browser decodes and deserializes the transaction with `VersionedTransaction.deserialize()`. The connected wallet adapter signs it. Private keys and seed phrases stay inside the wallet; Fetch only receives the signed transaction bytes.

For JupiterZ RFQ routes, the market maker may add its required signature during execution. The wallet therefore signs the transaction it receives without changing its message or instructions.

### 4. Execute and verify

The browser posts the base64 signed transaction, `requestId`, and optional `lastValidBlockHeight` to Fetch's `/api/jupiter/execute` route. The server forwards it to `POST /swap/v2/execute`.

Fetch reports success only when Jupiter returns `status: "Success"`. An HTTP 200 alone does not prove the swap landed. Failed results and Jupiter error codes remain failures, even when a transaction signature is present.

## Security boundary

- The API key is read from the server's private environment and never serialized into page data.
- The public proxy accepts only SOL, BONK, and USDC, limiting use of the application's Jupiter quota.
- Amounts are positive integer strings with a bounded length.
- Wallet addresses are parsed as Solana public keys.
- Execute payloads have strict type, base64-shape, and size checks.
- Upstream response bodies are not reflected wholesale to the browser on errors.

## Mainnet constraint

Jupiter routes real Solana mainnet liquidity. This app cannot be safely tested with devnet tokens. Local development can test quote parsing, validation, state transitions, and wallet rejection without submitting a trade; an end-to-end swap requires a funded mainnet wallet and should use a deliberately small amount.
