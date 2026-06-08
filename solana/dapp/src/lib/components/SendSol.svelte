<script lang="ts">
	import { walletStore } from '@svelte-on-solana/wallet-adapter-core';
	import { LAMPORTS_PER_SOL, SystemProgram, Transaction } from '@solana/web3.js';
	import { connection, explorerTxUrl, getErrorMessage, parsePublicKey, parseTokenAmount } from '$lib/solana';

	let recipient = $state('');
	let amount = $state('');
	let isSending = $state(false);
	let signature = $state<string | null>(null);
	let error = $state<string | null>(null);

	async function sendSol() {
		const from = $walletStore.publicKey;
		const sendTransaction = $walletStore.sendTransaction;

		if (!from || !sendTransaction) {
			error = 'Connect a wallet before sending SOL.';
			return;
		}

		isSending = true;
		error = null;
		signature = null;

		try {
			const toPubkey = parsePublicKey(recipient, 'recipient address');
			const lamports = parseTokenAmount(amount, 9);

			if (lamports > BigInt(Number.MAX_SAFE_INTEGER)) {
				throw new Error('Amount is too large for a native SOL transfer.');
			}

			const transaction = new Transaction().add(
				SystemProgram.transfer({
					fromPubkey: from,
					toPubkey,
					lamports: Number(lamports)
				})
			);
			const latestBlockhash = await connection.getLatestBlockhash('confirmed');
			transaction.recentBlockhash = latestBlockhash.blockhash;
			transaction.feePayer = from;

			const sentSignature = await sendTransaction(transaction, connection);
			const confirmation = await connection.confirmTransaction(
				{
					signature: sentSignature,
					blockhash: latestBlockhash.blockhash,
					lastValidBlockHeight: latestBlockhash.lastValidBlockHeight
				},
				'confirmed'
			);

			if (confirmation.value.err) {
				throw new Error('The SOL transfer was rejected by Devnet.');
			}

			signature = sentSignature;
			recipient = '';
			amount = '';
		} catch (err) {
			error = getErrorMessage(err, 'SOL transfer failed.');
		} finally {
			isSending = false;
		}
	}
</script>

<section class="rounded-2xl border border-white/[0.08] bg-white/[0.035] p-5">
	<p class="text-xs font-semibold tracking-[0.18em] text-slate-500 uppercase">Transfer</p>
	<h3 class="mt-2 text-lg font-semibold text-white">Send native SOL</h3>

	<div class="mt-5 grid gap-3">
		<input
			bind:value={recipient}
			class="rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-slate-100 outline-none transition placeholder:text-slate-600 focus:border-violet-300/60"
			placeholder="Recipient wallet address"
		/>
		<input
			bind:value={amount}
			inputmode="decimal"
			class="rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-slate-100 outline-none transition placeholder:text-slate-600 focus:border-violet-300/60"
			placeholder="Amount in SOL"
		/>
	</div>

	<button
		type="button"
		onclick={sendSol}
		disabled={isSending}
		class="mt-4 w-full rounded-xl bg-white px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-slate-200 disabled:cursor-wait disabled:opacity-60"
	>
		{isSending ? 'Confirming transfer...' : 'Send SOL'}
	</button>

	{#if signature}
		<a
			href={explorerTxUrl(signature)}
			target="_blank"
			rel="noreferrer"
			class="mt-4 block rounded-xl border border-emerald-300/20 bg-emerald-300/[0.07] p-4 text-sm font-medium text-emerald-200 underline decoration-emerald-300/30 underline-offset-4"
		>
			SOL transfer confirmed on Explorer
		</a>
	{/if}

	{#if error}
		<p class="mt-3 text-xs leading-5 text-red-300" role="alert">{error}</p>
	{/if}
</section>
