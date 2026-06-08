<script lang="ts">
	import '../app.css';
	import favicon from '$lib/assets/favicon.svg';
	import type { Adapter, WalletError } from '@solana/wallet-adapter-base';
	import { clusterApiUrl } from '@solana/web3.js';
	import { ConnectionProvider, WalletProvider } from '@svelte-on-solana/wallet-adapter-ui';
	import { onMount } from 'svelte';

	let { children } = $props();

	const network = clusterApiUrl('devnet');
	const localStorageKey = 'solana-dapp-wallet';

	let wallets = $state<Adapter[]>([]);
	let walletError = $state<string | null>(null);
	let errorTimer: ReturnType<typeof setTimeout> | undefined;

	onMount(() => {
		void loadWallets();
		return () => {
			if (errorTimer) clearTimeout(errorTimer);
		};
	});

	async function loadWallets() {
		const [{ PhantomWalletAdapter }, { SolflareWalletAdapter }] = await Promise.all([
			import('@solana/wallet-adapter-phantom'),
			import('@solana/wallet-adapter-solflare')
		]);
		wallets = [new PhantomWalletAdapter(), new SolflareWalletAdapter()];
	}

	function handleWalletError(error: WalletError) {
		walletError = error.message || 'The wallet could not complete that request.';
		if (errorTimer) clearTimeout(errorTimer);
		errorTimer = setTimeout(() => (walletError = null), 5000);
	}
</script>

<svelte:head>
	<title>Solana Devnet Faucet</title>
	<meta name="description" content="Connect a Solana wallet and request test SOL on Devnet." />
	<link rel="icon" href={favicon} />
</svelte:head>

<ConnectionProvider {network} config="confirmed" />
{#if wallets.length}
	<WalletProvider {localStorageKey} {wallets} autoConnect onError={handleWalletError} />
{/if}

<div class="relative isolate min-h-screen overflow-hidden">
	<div
		class="pointer-events-none absolute inset-x-0 top-0 -z-10 h-px bg-gradient-to-r from-transparent via-violet-400/80 to-transparent"
	></div>

	<header class="mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-6 sm:px-8">
		<a href="/" class="flex items-center gap-3 text-sm font-semibold tracking-wide text-white">
			<span
				class="grid size-9 place-items-center rounded-xl border border-white/10 bg-white/[0.06] shadow-lg shadow-violet-950/30"
				aria-hidden="true"
			>
				<svg viewBox="0 0 24 24" class="size-5" fill="none">
					<path d="M5 7h12.5L20 4.5H7.5L5 7Z" fill="#14F195" />
					<path d="M4 10.75h12.5l3.5 3.5H7.5l-3.5-3.5Z" fill="#9945FF" />
					<path d="M5 17h12.5l2.5 2.5H7.5L5 17Z" fill="#14F195" />
				</svg>
			</span>
			<span>DEVNET FAUCET</span>
		</a>
		<div
			class="flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/[0.07] px-3 py-1.5 text-xs font-medium text-emerald-300"
		>
			<span class="size-1.5 rounded-full bg-emerald-300 shadow-[0_0_10px_#6ee7b7]"></span>
			Solana Devnet
		</div>
	</header>

	{@render children()}

	<footer class="mx-auto flex w-full max-w-6xl justify-between px-5 py-8 text-xs text-slate-500 sm:px-8">
		<p>Test tokens have no monetary value.</p>
		<a
			href="https://explorer.solana.com/?cluster=devnet"
			target="_blank"
			rel="noreferrer"
			class="transition hover:text-slate-300"
		>
			Devnet Explorer
		</a>
	</footer>

	{#if walletError}
		<div
			role="alert"
			class="fixed right-4 bottom-4 z-50 max-w-sm rounded-xl border border-red-400/20 bg-red-950/95 px-4 py-3 text-sm text-red-200 shadow-2xl backdrop-blur"
		>
			{walletError}
		</div>
	{/if}
</div>
