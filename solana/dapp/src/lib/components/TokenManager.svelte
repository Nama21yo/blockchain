<script lang="ts">
	import { walletStore } from '@svelte-on-solana/wallet-adapter-core';
	import {
		TOKEN_2022_PROGRAM_ID,
		TOKEN_PROGRAM_ID,
		createAssociatedTokenAccountInstruction,
		createTransferCheckedInstruction,
		getAssociatedTokenAddress,
		getTokenMetadata
	} from '@solana/spl-token';
	import { PublicKey, Transaction } from '@solana/web3.js';
	import {
		connection,
		explorerTxUrl,
		getErrorMessage,
		parsePublicKey,
		parseTokenAmount,
		shortAddress
	} from '$lib/solana';

	type TokenBalance = {
		account: PublicKey;
		mint: PublicKey;
		programId: PublicKey;
		rawAmount: bigint;
		balance: string;
		decimals: number;
		name: string | null;
		symbol: string | null;
		image: string | null;
	};

	type Metadata = Pick<TokenBalance, 'name' | 'symbol' | 'image'>;

	const METAPLEX_METADATA_PROGRAM_ID = new PublicKey(
		'metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s'
	);
	const metadataSeed = new TextEncoder().encode('metadata');
	const decoder = new TextDecoder();

	let tokens = $state<TokenBalance[]>([]);
	let selectedAccount = $state('');
	let recipient = $state('');
	let amount = $state('');
	let isLoading = $state(false);
	let isSending = $state(false);
	let error = $state<string | null>(null);
	let signature = $state<string | null>(null);

	let selectedToken = $derived(tokens.find((token) => token.account.toBase58() === selectedAccount));

	async function fetchTokens() {
		const owner = $walletStore.publicKey;

		if (!owner) {
			error = 'Connect a wallet before loading tokens.';
			return;
		}

		isLoading = true;
		error = null;

		try {
			const programs = [TOKEN_PROGRAM_ID, TOKEN_2022_PROGRAM_ID];
			const responses = await Promise.all(
				programs.map(async (programId) => ({
					programId,
					response: await connection.getParsedTokenAccountsByOwner(owner, { programId }, 'confirmed')
				}))
			);

			const discovered = responses.flatMap(({ programId, response }) =>
				response.value.map(({ pubkey, account }) => {
					const info = account.data.parsed.info;
					const tokenAmount = info.tokenAmount;

					return {
						account: pubkey,
						mint: new PublicKey(info.mint),
						programId,
						rawAmount: BigInt(tokenAmount.amount),
						balance: tokenAmount.uiAmountString,
						decimals: tokenAmount.decimals,
						name: null,
						symbol: null,
						image: null
					} satisfies TokenBalance;
				})
			);

			tokens = await Promise.all(
				discovered
					.filter((token) => token.rawAmount > 0n)
					.map(async (token) => ({ ...token, ...(await loadMetadata(token.mint, token.programId)) }))
			);

			if (!tokens.some((token) => token.account.toBase58() === selectedAccount)) {
				selectedAccount = tokens[0]?.account.toBase58() ?? '';
			}
		} catch (err) {
			error = getErrorMessage(err, 'Could not load token accounts.');
		} finally {
			isLoading = false;
		}
	}

	async function sendToken() {
		const owner = $walletStore.publicKey;
		const sendTransaction = $walletStore.sendTransaction;
		const token = selectedToken;

		if (!owner || !sendTransaction) {
			error = 'Connect a wallet before sending tokens.';
			return;
		}

		if (!token) {
			error = 'Load and select a token first.';
			return;
		}

		isSending = true;
		error = null;
		signature = null;

		try {
			const recipientOwner = parsePublicKey(recipient, 'recipient address');
			const rawAmount = parseTokenAmount(amount, token.decimals);

			if (rawAmount > token.rawAmount) {
				throw new Error('Amount exceeds this token account balance.');
			}

			const recipientAta = await getAssociatedTokenAddress(
				token.mint,
				recipientOwner,
				false,
				token.programId
			);
			const transaction = new Transaction();

			if (!(await connection.getAccountInfo(recipientAta, 'confirmed'))) {
				transaction.add(
					createAssociatedTokenAccountInstruction(
						owner,
						recipientAta,
						recipientOwner,
						token.mint,
						token.programId
					)
				);
			}

			transaction.add(
				createTransferCheckedInstruction(
					token.account,
					token.mint,
					recipientAta,
					owner,
					rawAmount,
					token.decimals,
					[],
					token.programId
				)
			);

			const latestBlockhash = await connection.getLatestBlockhash('confirmed');
			transaction.recentBlockhash = latestBlockhash.blockhash;
			transaction.feePayer = owner;

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
				throw new Error('The token transfer was rejected by Devnet.');
			}

			signature = sentSignature;
			recipient = '';
			amount = '';
			await fetchTokens();
		} catch (err) {
			error = getErrorMessage(err, 'Token transfer failed.');
		} finally {
			isSending = false;
		}
	}

	async function loadMetadata(mint: PublicKey, programId: PublicKey): Promise<Metadata> {
		try {
			const metadata =
				programId.equals(TOKEN_2022_PROGRAM_ID)
					? await getTokenMetadata(connection, mint, 'confirmed', programId)
					: await loadLegacyMetadata(mint);

			if (!metadata) return emptyMetadata();

			return {
				name: metadata.name || null,
				symbol: metadata.symbol || null,
				image: await loadMetadataImage(metadata.uri)
			};
		} catch {
			return emptyMetadata();
		}
	}

	async function loadLegacyMetadata(mint: PublicKey) {
		const [metadataAddress] = PublicKey.findProgramAddressSync(
			[metadataSeed, METAPLEX_METADATA_PROGRAM_ID.toBytes(), mint.toBytes()],
			METAPLEX_METADATA_PROGRAM_ID
		);
		const account = await connection.getAccountInfo(metadataAddress, 'confirmed');

		if (!account) return null;

		let offset = 1 + 32 + 32;
		const name = readBorshString(account.data, offset);
		offset = name.offset;
		const symbol = readBorshString(account.data, offset);
		offset = symbol.offset;
		const uri = readBorshString(account.data, offset);

		return { name: name.value, symbol: symbol.value, uri: uri.value };
	}

	function readBorshString(data: Uint8Array, offset: number) {
		const length = new DataView(data.buffer, data.byteOffset + offset, 4).getUint32(0, true);
		const start = offset + 4;
		const end = start + length;
		const value = decoder.decode(data.slice(start, end)).replaceAll('\0', '').trim();
		return { value, offset: end };
	}

	async function loadMetadataImage(uri: string | undefined) {
		if (!uri) return null;

		const normalizedUri = normalizeUri(uri);
		const response = await fetch(normalizedUri);
		if (!response.ok) return null;

		const json = await response.json();
		return typeof json.image === 'string' ? normalizeUri(json.image) : null;
	}

	function normalizeUri(uri: string) {
		const trimmed = uri.replaceAll('\0', '').trim();
		return trimmed.startsWith('ipfs://') ? `https://ipfs.io/ipfs/${trimmed.slice(7)}` : trimmed;
	}

	function emptyMetadata(): Metadata {
		return { name: null, symbol: null, image: null };
	}
</script>

<section class="rounded-2xl border border-white/[0.08] bg-white/[0.035] p-5 lg:col-span-2">
	<div class="flex flex-wrap items-start justify-between gap-4">
		<div>
			<p class="text-xs font-semibold tracking-[0.18em] text-slate-500 uppercase">Assets</p>
			<h3 class="mt-2 text-lg font-semibold text-white">SPL token accounts</h3>
			<p class="mt-1 text-xs text-slate-500">Legacy Token and Token-2022 on Devnet</p>
		</div>
		<button
			type="button"
			onclick={fetchTokens}
			disabled={isLoading}
			class="rounded-full border border-white/10 bg-white/[0.06] px-4 py-2 text-xs font-semibold text-slate-200 transition hover:bg-white/10 disabled:cursor-wait disabled:opacity-60"
		>
			{isLoading ? 'Loading assets...' : 'Refresh assets'}
		</button>
	</div>

	{#if tokens.length}
		<div class="mt-5 grid gap-3 sm:grid-cols-2">
			{#each tokens as token}
				<button
					type="button"
					onclick={() => (selectedAccount = token.account.toBase58())}
					class="flex items-center gap-3 rounded-xl border p-3 text-left transition {selectedAccount ===
					token.account.toBase58()
						? 'border-amber-300/50 bg-amber-300/[0.08]'
						: 'border-white/[0.07] bg-black/15 hover:border-white/20'}"
				>
					{#if token.image}
						<img src={token.image} alt="" class="size-10 rounded-full bg-white/10 object-cover" />
					{:else}
						<span class="grid size-10 place-items-center rounded-full bg-white/[0.07] font-mono text-xs text-slate-400">
							{token.symbol?.slice(0, 2) ?? 'TK'}
						</span>
					{/if}
					<span class="min-w-0 flex-1">
						<span class="block truncate text-sm font-semibold text-slate-200">
							{token.name ?? token.symbol ?? shortAddress(token.mint.toBase58())}
						</span>
						<span class="mt-1 block font-mono text-[0.65rem] text-slate-500">
							{shortAddress(token.mint.toBase58())}
						</span>
					</span>
					<span class="text-right text-xs font-semibold text-slate-300">{token.balance}</span>
				</button>
			{/each}
		</div>
	{:else}
		<div class="mt-5 rounded-xl border border-dashed border-white/10 bg-black/10 p-6 text-center text-xs text-slate-500">
			Load the connected wallet's non-zero token accounts.
		</div>
	{/if}

	<div class="mt-6 grid gap-3 sm:grid-cols-[1fr_0.55fr_auto]">
		<input
			bind:value={recipient}
			class="rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-slate-100 outline-none transition placeholder:text-slate-600 focus:border-amber-300/60"
			placeholder="Recipient wallet address"
		/>
		<input
			bind:value={amount}
			inputmode="decimal"
			class="rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-slate-100 outline-none transition placeholder:text-slate-600 focus:border-amber-300/60"
			placeholder="Token amount"
		/>
		<button
			type="button"
			onclick={sendToken}
			disabled={isSending || !selectedToken}
			class="rounded-xl bg-amber-300 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-amber-200 disabled:cursor-not-allowed disabled:opacity-50"
		>
			{isSending ? 'Sending...' : 'Send token'}
		</button>
	</div>

	{#if signature}
		<a
			href={explorerTxUrl(signature)}
			target="_blank"
			rel="noreferrer"
			class="mt-4 block text-xs font-medium text-emerald-300 underline decoration-emerald-300/30 underline-offset-4"
		>
			Token transfer confirmed on Explorer
		</a>
	{/if}

	{#if error}
		<p class="mt-3 text-xs leading-5 text-red-300" role="alert">{error}</p>
	{/if}
</section>
