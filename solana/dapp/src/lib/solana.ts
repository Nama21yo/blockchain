import { Connection, PublicKey, type TransactionSignature } from '@solana/web3.js';

export const DEVNET_CLUSTER = 'devnet';

export const connection = new Connection('https://solana-devnet.g.alchemy.com/v2/ENn3gUvc1DsUeisTxP1FD', 'confirmed');

export function explorerTxUrl(signature: TransactionSignature) {
	return `https://explorer.solana.com/tx/${signature}?cluster=${DEVNET_CLUSTER}`;
}

export function shortAddress(address: string) {
	return address ? `${address.slice(0, 6)}...${address.slice(-6)}` : '';
}

export function parsePublicKey(value: string, label = 'address') {
	const trimmed = value.trim();

	if (!trimmed) {
		throw new Error(`Enter a ${label}.`);
	}

	try {
		return new PublicKey(trimmed);
	} catch {
		throw new Error(`Enter a valid Solana ${label}.`);
	}
}

export function parseTokenAmount(value: string, decimals: number) {
	const trimmed = value.trim();

	if (!trimmed) {
		throw new Error('Enter an amount.');
	}

	if (!/^\d+(\.\d+)?$/.test(trimmed)) {
		throw new Error('Enter a positive decimal amount.');
	}

	const [whole, fraction = ''] = trimmed.split('.');

	if (fraction.length > decimals) {
		throw new Error(`This token supports at most ${decimals} decimal places.`);
	}

	const paddedFraction = fraction.padEnd(decimals, '0');
	const raw = BigInt(whole) * 10n ** BigInt(decimals) + BigInt(paddedFraction || '0');

	if (raw <= 0n) {
		throw new Error('Amount must be greater than zero.');
	}

	return raw;
}

export function getErrorMessage(error: unknown, fallback: string) {
	return error instanceof Error && error.message ? error.message : fallback;
}
