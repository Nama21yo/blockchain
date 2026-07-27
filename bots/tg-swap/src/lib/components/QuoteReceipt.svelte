<script lang="ts">
	import { CircleAlert, LoaderCircle, Route } from 'lucide-svelte';
	import { formatCompactAmount } from '$lib/domain/amounts';
	import type { SwapToken } from '$lib/domain/tokens';
	import type { JupiterOrder } from '$lib/jupiter/types';

	let {
		quote,
		outputToken,
		loading,
		error
	}: {
		quote: JupiterOrder | null;
		outputToken: SwapToken;
		loading: boolean;
		error: string | null;
	} = $props();

	let priceImpact = $derived(quote?.priceImpactPct ? Number(quote.priceImpactPct) * 100 : null);
</script>

<article class="receipt-tail relative rounded-[1.6rem] rounded-tl-md border border-ledger bg-white p-5 shadow-[0_12px_40px_rgba(17,35,60,0.06)]" aria-live="polite">
	<div class="flex items-center justify-between gap-3 border-b border-dashed border-ledger pb-4">
		<div class="flex items-center gap-2">
			<span class="grid size-8 place-items-center rounded-full bg-telegram/10 text-telegram">
				<Route class="size-4" />
			</span>
			<div>
				<p class="font-display text-sm font-semibold">Route receipt</p>
				<p class="font-mono text-[10px] uppercase tracking-[0.14em] text-ink/42">Jupiter live order</p>
			</div>
		</div>
		<span class="rounded-full bg-cloud px-2.5 py-1 font-mono text-[10px] uppercase text-ink/55">Mainnet</span>
	</div>

	{#if loading}
		<div class="flex min-h-28 items-center gap-3 py-5 text-sm text-ink/55">
			<LoaderCircle class="size-5 animate-spin text-telegram" />
			Checking every available route…
		</div>
	{:else if error}
		<div class="flex min-h-28 items-start gap-3 py-5 text-sm leading-6 text-bonk">
			<CircleAlert class="mt-0.5 size-5 shrink-0" />
			<p>{error}</p>
		</div>
	{:else if quote}
		<div class="py-5">
			<p class="text-xs font-semibold text-ink/45">Expected output</p>
			<p class="mt-1 font-mono text-[clamp(1.75rem,4vw,2.5rem)] font-medium tracking-[-0.05em] text-ink">
				{formatCompactAmount(quote.outAmount, outputToken.decimals)}
				<span class="ml-1 text-base tracking-normal text-ink/50">{outputToken.symbol}</span>
			</p>
		</div>
		<dl class="grid grid-cols-3 gap-2 border-t border-dashed border-ledger pt-4">
			<div>
				<dt class="text-[10px] font-semibold uppercase tracking-wider text-ink/38">Router</dt>
				<dd class="mt-1 truncate font-mono text-xs text-ink">{quote.router}</dd>
			</div>
			<div>
				<dt class="text-[10px] font-semibold uppercase tracking-wider text-ink/38">Total fee</dt>
				<dd class="mt-1 font-mono text-xs text-ink">{quote.feeBps} bps</dd>
			</div>
			<div>
				<dt class="text-[10px] font-semibold uppercase tracking-wider text-ink/38">Price impact</dt>
				<dd class="mt-1 font-mono text-xs text-ink">{priceImpact === null ? '—' : `${priceImpact.toFixed(3)}%`}</dd>
			</div>
		</dl>
	{:else}
		<div class="flex min-h-28 items-center py-5 text-sm leading-6 text-ink/50">
			Enter an amount to ask Jupiter for the best route.
		</div>
	{/if}
</article>

<style>
	.receipt-tail::before {
		content: '';
		position: absolute;
		top: -1px;
		left: -11px;
		width: 16px;
		height: 17px;
		background: white;
		clip-path: polygon(100% 0, 100% 100%, 0 0);
		border-top: 1px solid var(--color-ledger);
	}
</style>
