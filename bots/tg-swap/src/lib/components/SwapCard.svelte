<script lang="ts">
	import { ArrowDownUp, CircleAlert, LoaderCircle, ShieldCheck } from 'lucide-svelte';
	import { TOKENS, type TokenSymbol } from '$lib/domain/tokens';
	import TokenSelect from './TokenSelect.svelte';

	let {
		amount = $bindable(),
		inputSymbol = $bindable(),
		outputSymbol = $bindable(),
		walletConnected,
		outputAmount,
		phase,
		error,
		onflip,
		onswap
	}: {
		amount: string;
		inputSymbol: TokenSymbol;
		outputSymbol: TokenSymbol;
		walletConnected: boolean;
		outputAmount: string | null;
		phase: 'idle' | 'building' | 'signing' | 'executing' | 'success';
		error: string | null;
		onflip: () => void;
		onswap: () => Promise<void>;
	} = $props();

	let busy = $derived(['building', 'signing', 'executing'].includes(phase));
	let actionLabel = $derived.by(() => {
		if (!walletConnected) return 'Connect wallet to swap';
		if (phase === 'building') return 'Building fresh order…';
		if (phase === 'signing') return 'Confirm in wallet…';
		if (phase === 'executing') return 'Landing on Solana…';
		if (phase === 'success') return 'Swap complete';
		return `Swap ${TOKENS[inputSymbol].symbol} for ${TOKENS[outputSymbol].symbol}`;
	});
</script>

<section class="rounded-[2rem] border border-ink/10 bg-white p-3 shadow-[0_28px_90px_rgba(17,35,60,0.12)] sm:p-4">
	<div class="flex items-center justify-between px-2 pt-2 pb-4">
		<div>
			<p class="font-display text-lg font-semibold tracking-[-0.02em]">Swap ticket</p>
			<p class="mt-0.5 text-xs text-ink/45">Jupiter chooses the best available route.</p>
		</div>
		<span class="rounded-full bg-[#e8f8f0] px-2.5 py-1 font-mono text-[10px] font-medium uppercase tracking-wide text-[#167953]">Live</span>
	</div>

	<div class="relative space-y-2">
		<div class="rounded-[1.6rem] border border-ledger bg-cloud/70 p-4 transition focus-within:border-telegram/45 focus-within:bg-white">
			<div class="flex items-center justify-between gap-4">
				<label for="swap-amount" class="text-xs font-semibold text-ink/48">You send</label>
				<TokenSelect bind:value={inputSymbol} exclude={outputSymbol} label="Token to send" />
			</div>
			<input
				id="swap-amount"
				bind:value={amount}
				inputmode="decimal"
				autocomplete="off"
				placeholder="0.00"
				class="mt-4 w-full bg-transparent font-mono text-[clamp(2rem,5vw,3rem)] tracking-[-0.06em] text-ink placeholder:text-ink/20 focus:outline-none"
			/>
			<div class="mt-3 flex gap-2">
				{#each inputSymbol === 'BONK' ? ['100K', '1M', '10M'] : ['0.1', '0.5', '1'] as preset}
					<button
						type="button"
						class="rounded-full border border-ledger bg-white px-3 py-1.5 font-mono text-[10px] text-ink/60 transition hover:border-telegram/40 hover:text-telegram"
						onclick={() => (amount = preset.endsWith('K') ? `${Number(preset.slice(0, -1)) * 1_000}` : preset.endsWith('M') ? `${Number(preset.slice(0, -1)) * 1_000_000}` : preset)}
					>
						{preset}
					</button>
				{/each}
			</div>
		</div>

		<div class="relative z-10 -my-5 grid place-items-center">
			<button
				type="button"
				class="grid size-11 place-items-center rounded-2xl border-4 border-white bg-coin text-ink shadow-sm transition hover:rotate-180 hover:scale-105"
				onclick={onflip}
				aria-label="Switch input and output tokens"
			>
				<ArrowDownUp class="size-4" strokeWidth={2.5} />
			</button>
		</div>

		<div class="rounded-[1.6rem] border border-ledger bg-cloud/70 p-4 pt-6">
			<div class="flex items-center justify-between gap-4">
				<p class="text-xs font-semibold text-ink/48">You receive</p>
				<TokenSelect bind:value={outputSymbol} exclude={inputSymbol} label="Token to receive" />
			</div>
			<p class={`mt-5 font-mono text-3xl tracking-[-0.05em] ${outputAmount ? 'text-ink' : 'text-ink/24'}`}>
				{outputAmount ?? 'Quoted live'}
				{#if outputAmount}<span class="ml-1 text-sm tracking-normal text-ink/45">{outputSymbol}</span>{/if}
			</p>
		</div>
	</div>

	{#if error}
		<div class="mt-3 flex items-start gap-2 rounded-2xl bg-bonk/8 px-4 py-3 text-xs leading-5 text-bonk" role="alert">
			<CircleAlert class="mt-0.5 size-4 shrink-0" />
			{error}
		</div>
	{/if}

	<button
		type="button"
		class="mt-3 flex w-full items-center justify-center gap-2 rounded-[1.35rem] bg-telegram px-5 py-4 text-sm font-bold text-white shadow-[0_12px_28px_rgba(34,158,217,0.28)] transition hover:-translate-y-0.5 hover:bg-[#168fc9] disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
		disabled={busy || phase === 'success'}
		onclick={onswap}
	>
		{#if busy}
			<LoaderCircle class="size-4 animate-spin" />
		{:else if phase === 'success'}
			<ShieldCheck class="size-4" />
		{/if}
		{actionLabel}
	</button>

	<p class="flex items-center justify-center gap-1.5 px-4 pt-4 pb-2 text-center text-[11px] text-ink/42">
		<ShieldCheck class="size-3.5" />
		Non-custodial. Fetch never sees your private key.
	</p>
</section>
