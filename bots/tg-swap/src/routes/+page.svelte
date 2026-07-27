<script lang="ts">
	import type { SignerWalletAdapter } from '@solana/wallet-adapter-base';
	import { onMount } from 'svelte';
	import { Check, ExternalLink, LockKeyhole, MessagesSquare, Send, ShieldCheck } from 'lucide-svelte';
	import BrandMark from '$lib/components/BrandMark.svelte';
	import QuoteReceipt from '$lib/components/QuoteReceipt.svelte';
	import SwapCard from '$lib/components/SwapCard.svelte';
	import WalletButton from '$lib/components/WalletButton.svelte';
	import { AmountError, formatCompactAmount, toAtomicAmount } from '$lib/domain/amounts';
	import { TOKENS, type TokenSymbol } from '$lib/domain/tokens';
	import { requestOrder, SwapApiError } from '$lib/jupiter/client';
	import { signAndExecuteSwap } from '$lib/jupiter/swap';
	import type { JupiterOrder } from '$lib/jupiter/types';
	import { createWalletAdapters } from '$lib/wallet/adapters';

	type SwapPhase = 'idle' | 'building' | 'signing' | 'executing' | 'success';

	let adapters = $state<SignerWalletAdapter[]>([]);
	let activeWallet = $state<SignerWalletAdapter | null>(null);
	let connecting = $state<string | null>(null);
	let walletError = $state<string | null>(null);
	let inputSymbol = $state<TokenSymbol>('SOL');
	let outputSymbol = $state<TokenSymbol>('BONK');
	let amount = $state('0.1');
	let quote = $state<JupiterOrder | null>(null);
	let quoteLoading = $state(false);
	let quoteError = $state<string | null>(null);
	let swapError = $state<string | null>(null);
	let phase = $state<SwapPhase>('idle');
	let signature = $state<string | null>(null);

	let inputToken = $derived(TOKENS[inputSymbol]);
	let outputToken = $derived(TOKENS[outputSymbol]);
	let outputAmount = $derived(quote ? formatCompactAmount(quote.outAmount, outputToken.decimals) : null);

	onMount(() => {
		adapters = createWalletAdapters();
	});

	$effect(() => {
		const currentAmount = amount;
		const currentInput = inputToken;
		const currentOutput = outputToken;
		const controller = new AbortController();
		let timer: ReturnType<typeof setTimeout>;

		try {
			const atomicAmount = toAtomicAmount(currentAmount, currentInput.decimals);
			quoteLoading = true;
			quoteError = null;
			timer = setTimeout(async () => {
				try {
					quote = await requestOrder(
						{
							inputMint: currentInput.mint,
							outputMint: currentOutput.mint,
							amount: atomicAmount
						},
						controller.signal
					);
				} catch (error) {
					if (controller.signal.aborted) return;
					quote = null;
					quoteError = error instanceof Error ? error.message : 'A quote is not available.';
				} finally {
					if (!controller.signal.aborted) quoteLoading = false;
				}
			}, 450);
		} catch (error) {
			quote = null;
			quoteLoading = false;
			quoteError = currentAmount.trim() ? (error as Error).message : null;
		}

		return () => {
			clearTimeout(timer);
			controller.abort();
		};
	});

	async function connectWallet(adapter: SignerWalletAdapter) {
		walletError = null;
		connecting = adapter.name;
		try {
			await adapter.connect();
			activeWallet = adapter;
		} catch (error) {
			walletError = error instanceof Error ? error.message : 'The wallet connection was cancelled.';
		} finally {
			connecting = null;
		}
	}

	async function disconnectWallet() {
		if (activeWallet) await activeWallet.disconnect();
		activeWallet = null;
		phase = 'idle';
	}

	function flipTokens() {
		[inputSymbol, outputSymbol] = [outputSymbol, inputSymbol];
		phase = 'idle';
		swapError = null;
	}

	async function swap() {
		swapError = null;
		signature = null;
		if (!activeWallet) {
			swapError = 'Connect Phantom or Solflare from the top-right button, then try again.';
			return;
		}

		try {
			const atomicAmount = toAtomicAmount(amount, inputToken.decimals);
			const result = await signAndExecuteSwap({
				wallet: activeWallet,
				inputMint: inputToken.mint,
				outputMint: outputToken.mint,
				amount: atomicAmount,
				onPhase: (nextPhase) => (phase = nextPhase)
			});
			signature = result.signature;
			phase = 'success';
		} catch (error) {
			phase = 'idle';
			if (error instanceof AmountError || error instanceof SwapApiError || error instanceof Error) {
				swapError = error.message;
			} else {
				swapError = 'The swap did not complete. Your tokens were not exchanged.';
			}
		}
	}
</script>

<svelte:head>
	<title>Fetch — BONK swaps on Solana</title>
	<meta name="description" content="Swap BONK, SOL, and USDC from your own wallet with Jupiter routing under the hood." />
</svelte:head>

<div class="min-h-screen overflow-hidden bg-cloud">
	<div class="pointer-events-none fixed inset-0 opacity-55" aria-hidden="true">
		<div class="absolute -top-32 left-[12%] size-80 rounded-full bg-telegram/10 blur-3xl"></div>
		<div class="absolute right-[8%] bottom-[-10rem] size-96 rounded-full bg-coin/20 blur-3xl"></div>
	</div>

	<header class="relative z-20 mx-auto flex max-w-[1240px] items-center justify-between px-5 py-5 sm:px-8 lg:px-10">
		<a href="/" class="flex items-center gap-3 rounded-xl" aria-label="Fetch home">
			<BrandMark />
			<div>
				<p class="font-display text-lg font-bold leading-none tracking-[-0.04em]">Fetch</p>
				<p class="mt-1 font-mono text-[9px] uppercase tracking-[0.18em] text-ink/42">Swap desk</p>
			</div>
		</a>
		<nav class="hidden items-center gap-1 rounded-full border border-ledger bg-white/70 p-1 text-xs font-semibold shadow-sm backdrop-blur sm:flex" aria-label="Product navigation">
			<a href="#swap" class="rounded-full bg-white px-4 py-2 text-ink shadow-sm">Swap</a>
			<a href="#how-it-works" class="rounded-full px-4 py-2 text-ink/48 transition hover:text-ink">How it works</a>
		</nav>
		<WalletButton {adapters} {activeWallet} {connecting} onconnect={connectWallet} ondisconnect={disconnectWallet} />
	</header>

	<main class="relative mx-auto max-w-[1240px] px-5 pt-10 pb-16 sm:px-8 lg:px-10 lg:pt-16">
		<div class="grid items-start gap-12 lg:grid-cols-[minmax(0,1fr)_430px] lg:gap-16">
			<section>
				<div class="max-w-2xl">
					<div class="inline-flex items-center gap-2 rounded-full border border-ledger bg-white/75 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-ink/58 shadow-sm backdrop-blur">
						<span class="size-1.5 rounded-full bg-[#34c785]"></span>
						Jupiter routes / you sign
					</div>
					<h1 class="mt-6 font-display text-[clamp(3.2rem,7vw,6.4rem)] leading-[0.87] font-semibold tracking-[-0.075em] text-ink">
						Send a swap.<br />
						<span class="relative inline-block text-telegram">
							Fetch the best route.
							<svg class="absolute right-0 -bottom-3 h-3 w-[72%] text-bonk" viewBox="0 0 300 14" fill="none" aria-hidden="true">
								<path d="M3 10C72 1 209 1 297 7" stroke="currentColor" stroke-width="5" stroke-linecap="round" />
							</svg>
						</span>
					</h1>
					<p class="mt-9 max-w-lg text-base leading-7 text-ink/58 sm:text-lg">
						Swap BONK, SOL, and USDC from your own wallet. Jupiter checks the market; Fetch turns the route into one clear conversation.
					</p>
				</div>

				<div class="mt-12 max-w-[620px] space-y-4 sm:mt-16">
					<div class="flex gap-3">
						<div class="mt-1 shrink-0"><BrandMark size={34} /></div>
						<div class="rounded-[1.4rem] rounded-tl-sm border border-ledger bg-white px-4 py-3 text-sm leading-6 text-ink/64 shadow-sm">
							Tell me what you want to send. I’ll ask every eligible Jupiter router for its best executable price.
							<p class="mt-1 font-mono text-[9px] uppercase tracking-wider text-ink/32">Fetch bot · now</p>
						</div>
					</div>

					<QuoteReceipt {quote} {outputToken} loading={quoteLoading} error={quoteError} />

					{#if walletError}
						<div class="ml-11 rounded-2xl bg-bonk/8 px-4 py-3 text-sm text-bonk" role="alert">{walletError}</div>
					{/if}

					{#if signature}
						<div class="ml-auto flex max-w-[88%] items-start gap-3 rounded-[1.4rem] rounded-tr-sm bg-telegram px-4 py-3 text-sm text-white shadow-[0_10px_30px_rgba(34,158,217,0.22)]">
							<Check class="mt-0.5 size-4 shrink-0" />
							<div>
								<p class="font-semibold">Swap confirmed on Solana.</p>
								<a class="mt-1 inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-wide text-white/75 hover:text-white" href={`https://solscan.io/tx/${signature}`} target="_blank" rel="noreferrer">
									View receipt <ExternalLink class="size-3" />
								</a>
							</div>
						</div>
					{/if}
				</div>
			</section>

			<aside id="swap" class="scroll-mt-6 lg:sticky lg:top-6">
				<SwapCard bind:amount bind:inputSymbol bind:outputSymbol walletConnected={Boolean(activeWallet?.connected)} {outputAmount} {phase} error={swapError} onflip={flipTokens} onswap={swap} />
			</aside>
		</div>

		<section id="how-it-works" class="mt-20 border-t border-ledger pt-8 lg:mt-28">
			<div class="grid gap-5 md:grid-cols-3">
				{#each [
					{ icon: MessagesSquare, label: 'Quote', text: 'Jupiter compares onchain routes and RFQ market makers without preparing a stale transaction.' },
					{ icon: LockKeyhole, label: 'Sign', text: 'Fetch rebuilds the order with your address. Your wallet signs the v0 transaction locally.' },
					{ icon: Send, label: 'Land', text: 'Jupiter executes, broadcasts, and confirms. Success means the transaction actually landed.' }
				] as item}
					<article class="flex gap-4 rounded-2xl border border-transparent p-3 transition hover:border-ledger hover:bg-white/60">
						<span class="grid size-10 shrink-0 place-items-center rounded-xl bg-white text-telegram shadow-sm"><item.icon class="size-4" /></span>
						<div>
							<h2 class="font-display text-sm font-semibold">{item.label}</h2>
							<p class="mt-1 text-xs leading-5 text-ink/48">{item.text}</p>
						</div>
					</article>
				{/each}
			</div>
		</section>
	</main>

	<footer class="relative border-t border-ledger bg-white/45">
		<div class="mx-auto flex max-w-[1240px] flex-col gap-3 px-5 py-6 text-xs text-ink/45 sm:flex-row sm:items-center sm:justify-between sm:px-8 lg:px-10">
			<p class="flex items-center gap-2"><ShieldCheck class="size-4 text-telegram" /> Non-custodial swaps powered by Jupiter Swap V2.</p>
			<p class="font-mono text-[10px] uppercase tracking-wider">Solana mainnet only · Trade carefully</p>
		</div>
	</footer>
</div>
