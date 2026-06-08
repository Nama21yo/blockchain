<script lang="ts">
	import { walletStore } from '@svelte-on-solana/wallet-adapter-core';
	import { encodeURL } from '@solana/pay';
	import QRCode from 'qrcode';
	import { getErrorMessage, parsePublicKey } from '$lib/solana';

	type TransferRequest = Extract<Parameters<typeof encodeURL>[0], { recipient: unknown }>;

	let recipient = $state('');
	let amount = $state('0.1');
	let label = $state('Devnet payment');
	let message = $state('Thanks for testing Solana Pay');
	let memo = $state('');
	let splToken = $state('');
	let paymentUrl = $state('');
	let qrDataUrl = $state('');
	let error = $state<string | null>(null);
	let copied = $state(false);
	let isGenerating = $state(false);

	$effect(() => {
		if (!recipient && $walletStore.publicKey) {
			recipient = $walletStore.publicKey.toBase58();
		}
	});

	async function generatePayment() {
		isGenerating = true;
		error = null;
		paymentUrl = '';
		qrDataUrl = '';

		try {
			const recipientAddress = parsePublicKey(recipient, 'payment recipient').toBase58();
			const parsedAmount = Number(amount);

			if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
				throw new Error('Enter a payment amount greater than zero.');
			}

			const fields: TransferRequest = {
				recipient: recipientAddress as TransferRequest['recipient'],
				amount: parsedAmount,
				label: label.trim() || undefined,
				message: message.trim() || undefined,
				memo: memo.trim() || undefined
			};

			if (splToken.trim()) {
				fields.splToken = parsePublicKey(splToken, 'SPL token mint').toBase58() as TransferRequest['splToken'];
			}

			paymentUrl = encodeURL(fields).toString();
			qrDataUrl = await QRCode.toDataURL(paymentUrl, {
				width: 360,
				margin: 2,
				color: { dark: '#07111d', light: '#ffffff' }
			});
		} catch (err) {
			error = getErrorMessage(err, 'Could not generate the Solana Pay request.');
		} finally {
			isGenerating = false;
		}
	}

	async function copyPaymentUrl() {
		if (!paymentUrl) return;
		await navigator.clipboard.writeText(paymentUrl);
		copied = true;
		setTimeout(() => (copied = false), 1500);
	}
</script>

<section class="rounded-2xl border border-white/[0.08] bg-white/[0.035] p-5 lg:col-span-2">
	<div class="grid gap-6 lg:grid-cols-[1fr_240px]">
		<div>
			<p class="text-xs font-semibold tracking-[0.18em] text-slate-500 uppercase">Checkout</p>
			<h3 class="mt-2 text-lg font-semibold text-white">Solana Pay transfer request</h3>
			<p class="mt-1 text-xs leading-5 text-slate-500">
				Generate a standards-based QR for SOL or an SPL token payment.
			</p>

			<div class="mt-5 grid gap-3 sm:grid-cols-2">
				<input
					bind:value={recipient}
					class="sm:col-span-2 rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-slate-100 outline-none transition placeholder:text-slate-600 focus:border-emerald-300/60"
					placeholder="Payment recipient"
				/>
				<input
					bind:value={amount}
					inputmode="decimal"
					class="rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-slate-100 outline-none transition placeholder:text-slate-600 focus:border-emerald-300/60"
					placeholder="Amount"
				/>
				<input
					bind:value={splToken}
					class="rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-slate-100 outline-none transition placeholder:text-slate-600 focus:border-emerald-300/60"
					placeholder="SPL mint (optional)"
				/>
				<input
					bind:value={label}
					class="rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-slate-100 outline-none transition placeholder:text-slate-600 focus:border-emerald-300/60"
					placeholder="Store label"
				/>
				<input
					bind:value={memo}
					class="rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-slate-100 outline-none transition placeholder:text-slate-600 focus:border-emerald-300/60"
					placeholder="Memo (optional)"
				/>
				<input
					bind:value={message}
					class="sm:col-span-2 rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-slate-100 outline-none transition placeholder:text-slate-600 focus:border-emerald-300/60"
					placeholder="Wallet message"
				/>
			</div>

			<div class="mt-4 flex flex-wrap gap-3">
				<button
					type="button"
					onclick={generatePayment}
					disabled={isGenerating}
					class="rounded-xl bg-emerald-300 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-emerald-200 disabled:cursor-wait disabled:opacity-60"
				>
					{isGenerating ? 'Generating...' : 'Generate payment QR'}
				</button>
				{#if paymentUrl}
					<button
						type="button"
						onclick={copyPaymentUrl}
						class="rounded-xl border border-white/10 px-5 py-3 text-sm font-semibold text-slate-200 transition hover:bg-white/[0.06]"
					>
						{copied ? 'Copied' : 'Copy payment URL'}
					</button>
				{/if}
			</div>

			{#if error}
				<p class="mt-3 text-xs leading-5 text-red-300" role="alert">{error}</p>
			{/if}
		</div>

		<div class="grid min-h-60 place-items-center rounded-2xl border border-dashed border-white/10 bg-black/15 p-4">
			{#if qrDataUrl}
				<img src={qrDataUrl} alt="Solana Pay QR code" class="w-full rounded-xl" />
			{:else}
				<p class="max-w-32 text-center text-xs leading-5 text-slate-600">Payment QR will appear here.</p>
			{/if}
		</div>
	</div>
</section>
