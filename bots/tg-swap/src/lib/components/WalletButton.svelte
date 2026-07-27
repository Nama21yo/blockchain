<script lang="ts">
	import type { SignerWalletAdapter } from '@solana/wallet-adapter-base';
	import { Wallet, X } from 'lucide-svelte';
	import { shortAddress } from '$lib/wallet/adapters';

	let {
		adapters,
		activeWallet,
		connecting,
		onconnect,
		ondisconnect
	}: {
		adapters: SignerWalletAdapter[];
		activeWallet: SignerWalletAdapter | null;
		connecting: string | null;
		onconnect: (adapter: SignerWalletAdapter) => Promise<void>;
		ondisconnect: () => Promise<void>;
	} = $props();

	let open = $state(false);
	let address = $derived(activeWallet?.publicKey?.toBase58() ?? '');
</script>

<div class="relative">
	{#if activeWallet && address}
		<div class="flex items-center gap-1 rounded-full border border-ledger bg-white p-1 shadow-sm">
			<span class="flex items-center gap-2 px-3 font-mono text-xs font-medium text-ink">
				<span class="size-2 rounded-full bg-[#34c785]"></span>
				{shortAddress(address)}
			</span>
			<button
				type="button"
				class="grid size-8 place-items-center rounded-full text-ink/45 transition hover:bg-cloud hover:text-ink"
				onclick={ondisconnect}
				aria-label="Disconnect wallet"
			>
				<X class="size-4" />
			</button>
		</div>
	{:else}
		<button
			type="button"
			class="flex items-center gap-2 rounded-full bg-ink px-4 py-2.5 text-sm font-semibold text-white shadow-[0_8px_20px_rgba(17,35,60,0.16)] transition hover:-translate-y-0.5 hover:bg-ink/90"
			onclick={() => (open = !open)}
			aria-expanded={open}
		>
			<Wallet class="size-4" />
			Connect wallet
		</button>
	{/if}

	{#if open && !activeWallet}
		<div class="absolute top-[calc(100%+0.65rem)] right-0 z-30 w-64 rounded-2xl border border-ledger bg-white p-2 shadow-[0_18px_60px_rgba(17,35,60,0.18)]">
			<p class="px-3 pt-2 pb-2 text-xs font-semibold text-ink/50">Choose a Solana wallet</p>
			{#each adapters as adapter}
				<button
					type="button"
					class="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition hover:bg-cloud disabled:cursor-wait disabled:opacity-55"
					disabled={connecting !== null}
					onclick={async () => {
						await onconnect(adapter);
						open = false;
					}}
				>
					<img src={adapter.icon} alt="" class="size-8 rounded-lg" />
					<span class="flex-1 font-display text-sm font-semibold">{adapter.name}</span>
					<span class="font-mono text-[10px] uppercase text-ink/40">
						{connecting === adapter.name ? 'Opening' : 'Select'}
					</span>
				</button>
			{/each}
		</div>
	{/if}
</div>
