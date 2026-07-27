<script lang="ts">
	import { ChevronDown } from 'lucide-svelte';
	import { TOKEN_LIST, TOKENS, type TokenSymbol } from '$lib/domain/tokens';
	import TokenBadge from './TokenBadge.svelte';

	let {
		value = $bindable(),
		exclude,
		label
	}: { value: TokenSymbol; exclude: TokenSymbol; label: string } = $props();

	let selected = $derived(TOKENS[value]);
</script>

<label class="relative flex cursor-pointer items-center gap-2 rounded-2xl border border-ledger bg-cloud/75 py-2 pr-3 pl-2 transition hover:border-telegram/40 hover:bg-white focus-within:ring-2 focus-within:ring-telegram/25">
	<span class="sr-only">{label}</span>
	<TokenBadge token={selected} />
	<span class="font-display text-sm font-semibold text-ink">{selected.symbol}</span>
	<ChevronDown class="size-4 text-ink/45" strokeWidth={2} />
	<select
		bind:value
		class="absolute inset-0 cursor-pointer opacity-0"
		aria-label={label}
	>
		{#each TOKEN_LIST as token}
			{#if token.symbol !== exclude}
				<option value={token.symbol}>{token.name} ({token.symbol})</option>
			{/if}
		{/each}
	</select>
</label>
