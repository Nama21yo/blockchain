<script lang="ts">
	import { walletStore } from '@svelte-on-solana/wallet-adapter-core';
	import { Connection, LAMPORTS_PER_SOL, PublicKey, clusterApiUrl } from '@solana/web3.js';
	import { WalletMultiButton } from '@svelte-on-solana/wallet-adapter-ui';

	const connection = new Connection(clusterApiUrl('devnet'), 'confirmed');

	let isLoading = $state(false);
	let isBalanceLoading = $state(false);
	let balance = $state<number | null>(null);
	let balanceError = $state<string | null>(null);
	let txSignature = $state<string | null>(null);
	let networkError = $state<string | null>(null);
	let balanceRequest = 0;

	let publicKey = $derived($walletStore.publicKey);
	let connected = $derived(Boolean($walletStore.connected && publicKey));
	let address = $derived(publicKey?.toBase58() ?? '');
	let shortAddress = $derived(address ? `${address.slice(0, 6)}...${address.slice(-6)}` : '');

	$effect(() => {
		const key = publicKey;

		if (!key) {
			balanceRequest += 1;
			balance = null;
			balanceError = null;
			txSignature = null;
			networkError = null;
			return;
		}

		void refreshBalance(key);
	});

	async function refreshBalance(key: PublicKey | null = publicKey) {
		if (!key) return;

		const request = ++balanceRequest;
		isBalanceLoading = true;
		balanceError = null;

		try {
			const lamports = await connection.getBalance(key, 'confirmed');
			if (request === balanceRequest) balance = lamports / LAMPORTS_PER_SOL;
		} catch (error) {
			if (request === balanceRequest) {
				balanceError = getErrorMessage(error, 'Could not load the wallet balance.');
			}
		} finally {
			if (request === balanceRequest) isBalanceLoading = false;
		}
	}

	async function requestAirdrop() {
		const recipient = publicKey;

		if (!recipient) {
			networkError = 'Connect a wallet before requesting Devnet SOL.';
			return;
		}

		isLoading = true;
		txSignature = null;
		networkError = null;

		try {
			const signature = await connection.requestAirdrop(recipient, LAMPORTS_PER_SOL);
			const latestBlockhash = await connection.getLatestBlockhash('confirmed');
			const confirmation = await connection.confirmTransaction(
				{
					signature,
					blockhash: latestBlockhash.blockhash,
					lastValidBlockHeight: latestBlockhash.lastValidBlockHeight
				},
				'confirmed'
			);

			if (confirmation.value.err) {
				throw new Error('The airdrop transaction was rejected by Devnet.');
			}

			txSignature = signature;
			await refreshBalance(recipient);
		} catch (error) {
			networkError = getErrorMessage(
				error,
				'Airdrop failed. The public Devnet faucet may be rate-limiting requests.'
			);
		} finally {
			isLoading = false;
		}
	}

	function getErrorMessage(error: unknown, fallback: string) {
		return error instanceof Error && error.message ? error.message : fallback;
	}
</script>

<main class="mx-auto w-full max-w-6xl px-5 pt-12 pb-16 sm:px-8 sm:pt-20">
	<section class="mx-auto max-w-3xl text-center">
		<div
			class="mx-auto mb-6 inline-flex items-center gap-2 rounded-full border border-violet-400/20 bg-violet-400/[0.07] px-3 py-1 text-xs font-medium text-violet-200"
		>
			<span class="font-mono text-violet-300">01</span>
			Build and test on Solana
		</div>
		<h1 class="text-4xl font-semibold tracking-[-0.04em] text-white sm:text-6xl">
			Fund your next
			<span class="bg-gradient-to-r from-violet-400 to-emerald-300 bg-clip-text text-transparent">
				Devnet idea.
			</span>
		</h1>
		<p class="mx-auto mt-6 max-w-xl text-base leading-7 text-slate-400 sm:text-lg">
			Connect a Solana wallet and request 1 test SOL for development, demos, and
			experimentation.
		</p>
	</section>

	<section
		class="relative mx-auto mt-12 max-w-2xl overflow-hidden rounded-3xl border border-white/10 bg-white/[0.045] p-1 shadow-2xl shadow-violet-950/30 backdrop-blur-xl sm:mt-16"
	>
		<div
			class="pointer-events-none absolute inset-x-20 top-0 h-px bg-gradient-to-r from-transparent via-violet-300 to-transparent"
		></div>
		<div class="rounded-[1.35rem] border border-white/[0.06] bg-[#080c19]/80 p-5 sm:p-8">
			<div class="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
				<div>
					<p class="text-xs font-semibold tracking-[0.18em] text-slate-500 uppercase">
						Wallet connection
					</p>
					<h2 class="mt-2 text-xl font-semibold text-white">
						{connected ? 'Wallet connected' : 'Connect to get started'}
					</h2>
				</div>
				<div class="self-start sm:self-auto">
					<WalletMultiButton maxNumberOfWallets={2} />
				</div>
			</div>

			<div class="my-7 h-px bg-white/[0.07]"></div>

			{#if connected}
				<div class="grid gap-4 sm:grid-cols-2">
					<div class="rounded-2xl border border-white/[0.07] bg-white/[0.035] p-4">
						<div class="flex items-center justify-between gap-3">
							<p class="text-xs font-medium text-slate-500 uppercase">Address</p>
							<span class="size-2 rounded-full bg-emerald-300 shadow-[0_0_12px_#6ee7b7]"></span>
						</div>
						<p class="mt-3 font-mono text-sm text-slate-200" title={address}>{shortAddress}</p>
					</div>

					<div class="rounded-2xl border border-white/[0.07] bg-white/[0.035] p-4">
						<div class="flex items-center justify-between gap-3">
							<p class="text-xs font-medium text-slate-500 uppercase">Balance</p>
							<button
								type="button"
								onclick={() => void refreshBalance()}
								disabled={isBalanceLoading}
								class="text-xs text-violet-300 transition hover:text-violet-200 disabled:cursor-wait disabled:opacity-50"
							>
								{isBalanceLoading ? 'Refreshing...' : 'Refresh'}
							</button>
						</div>
						<p class="mt-3 text-sm font-semibold text-slate-200">
							{balance === null ? '--' : balance.toLocaleString(undefined, { maximumFractionDigits: 4 })}
							<span class="font-normal text-slate-500">SOL</span>
						</p>
					</div>
				</div>

				{#if balanceError}
					<p class="mt-3 text-xs text-amber-300" role="status">{balanceError}</p>
				{/if}

				<button
					type="button"
					onclick={requestAirdrop}
					disabled={isLoading}
					class="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-5 py-3.5 text-sm font-semibold text-white shadow-lg shadow-indigo-950/40 transition hover:-translate-y-0.5 hover:from-violet-500 hover:to-indigo-500 disabled:cursor-wait disabled:opacity-60 disabled:hover:translate-y-0"
				>
					{#if isLoading}
						<span class="size-4 animate-spin rounded-full border-2 border-white/30 border-t-white"></span>
						Confirming on Devnet...
					{:else}
						Request 1 SOL
						<svg viewBox="0 0 20 20" fill="none" class="size-4" aria-hidden="true">
							<path d="M4 10h12m-5-5 5 5-5 5" stroke="currentColor" stroke-width="1.7" />
						</svg>
					{/if}
				</button>
			{:else}
				<div class="rounded-2xl border border-dashed border-white/10 bg-white/[0.025] px-5 py-9 text-center">
					<div
						class="mx-auto grid size-11 place-items-center rounded-full border border-white/10 bg-white/[0.05] text-slate-400"
					>
						<svg viewBox="0 0 24 24" fill="none" class="size-5" aria-hidden="true">
							<path
								d="M5 7.5h13a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-11a2 2 0 0 1 2-2h11"
								stroke="currentColor"
								stroke-width="1.5"
								stroke-linecap="round"
							/>
							<path d="M16 12h4v3h-4a1.5 1.5 0 0 1 0-3Z" stroke="currentColor" stroke-width="1.5" />
						</svg>
					</div>
					<p class="mt-4 text-sm font-medium text-slate-300">No wallet connected</p>
					<p class="mt-1 text-xs leading-5 text-slate-500">Use Phantom or Solflare to continue.</p>
				</div>
			{/if}

			{#if txSignature}
				<div
					class="mt-5 rounded-xl border border-emerald-400/20 bg-emerald-400/[0.07] p-4 text-sm text-emerald-200"
					role="status"
				>
					<p class="font-semibold">Airdrop confirmed.</p>
					<a
						href={`https://explorer.solana.com/tx/${txSignature}?cluster=devnet`}
						target="_blank"
						rel="noreferrer"
						class="mt-1 inline-flex items-center gap-1 text-xs text-emerald-300 underline decoration-emerald-400/40 underline-offset-4 transition hover:text-emerald-200"
					>
						View transaction on Solana Explorer
					</a>
				</div>
			{/if}

			{#if networkError}
				<div
					class="mt-5 rounded-xl border border-red-400/20 bg-red-400/[0.07] p-4 text-sm text-red-200"
					role="alert"
				>
					<p class="font-semibold">Request failed</p>
					<p class="mt-1 text-xs leading-5 text-red-200/70">{networkError}</p>
				</div>
			{/if}
		</div>
	</section>

	<section class="mx-auto mt-10 grid max-w-2xl gap-3 sm:grid-cols-3">
		{#each [
			['01', 'Connect', 'Choose a supported wallet.'],
			['02', 'Request', 'Ask Devnet for 1 test SOL.'],
			['03', 'Build', 'Use it in your next project.']
		] as step}
			<div class="rounded-xl border border-white/[0.06] bg-white/[0.025] p-4">
				<p class="font-mono text-[0.65rem] text-violet-400">{step[0]}</p>
				<p class="mt-2 text-sm font-medium text-slate-200">{step[1]}</p>
				<p class="mt-1 text-xs leading-5 text-slate-500">{step[2]}</p>
			</div>
		{/each}
	</section>
</main>
