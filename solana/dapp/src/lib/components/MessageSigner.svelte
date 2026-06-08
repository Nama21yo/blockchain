<script lang="ts">
	import { walletStore } from '@svelte-on-solana/wallet-adapter-core';
	import { ed25519 } from '@noble/curves/ed25519.js';
	import bs58 from 'bs58';
	import { getErrorMessage } from '$lib/solana';

	let message = $state('Sign this message to prove wallet ownership.');
	let signature = $state<string | null>(null);
	let verified = $state<boolean | null>(null);
	let error = $state<string | null>(null);
	let isSigning = $state(false);

	async function signMessage() {
		const signer = $walletStore.signMessage;
		const publicKey = $walletStore.publicKey;

		if (!publicKey || !signer) {
			error = 'Connect a wallet that supports message signing.';
			return;
		}

		if (!message.trim()) {
			error = 'Enter a message to sign.';
			return;
		}

		isSigning = true;
		error = null;
		signature = null;
		verified = null;

		try {
			const encodedMessage = new TextEncoder().encode(message);
			const signed = await signer(encodedMessage);
			const isValid = ed25519.verify(signed, encodedMessage, publicKey.toBytes());

			if (!isValid) {
				throw new Error('The signature did not verify against this public key.');
			}

			signature = bs58.encode(signed);
			verified = true;
		} catch (err) {
			error = getErrorMessage(err, 'Message signing failed.');
		} finally {
			isSigning = false;
		}
	}
</script>

<section class="rounded-2xl border border-white/[0.08] bg-white/[0.035] p-5">
	<div class="flex items-start justify-between gap-4">
		<div>
			<p class="text-xs font-semibold tracking-[0.18em] text-slate-500 uppercase">Auth</p>
			<h3 class="mt-2 text-lg font-semibold text-white">Prove wallet ownership</h3>
		</div>
		<span class="rounded-full bg-cyan-300/10 px-2.5 py-1 text-xs font-medium text-cyan-200">
			ed25519
		</span>
	</div>

	<textarea
		bind:value={message}
		rows="3"
		class="mt-5 w-full resize-none rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-slate-100 outline-none transition placeholder:text-slate-600 focus:border-cyan-300/60"
		placeholder="Message to sign"
	></textarea>

	<button
		type="button"
		onclick={signMessage}
		disabled={isSigning}
		class="mt-4 w-full rounded-xl bg-cyan-300 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-200 disabled:cursor-wait disabled:opacity-60"
	>
		{isSigning ? 'Waiting for wallet...' : 'Sign and verify'}
	</button>

	{#if signature}
		<div class="mt-4 rounded-xl border border-emerald-300/20 bg-emerald-300/[0.07] p-4">
			<p class="text-sm font-semibold text-emerald-200">
				{verified ? 'Signature verified locally.' : 'Signature received.'}
			</p>
			<p class="mt-2 break-all font-mono text-xs text-emerald-100/80">{signature}</p>
		</div>
	{/if}

	{#if error}
		<p class="mt-3 text-xs leading-5 text-red-300" role="alert">{error}</p>
	{/if}
</section>
