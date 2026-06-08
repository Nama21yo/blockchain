import { env } from '$env/dynamic/public';
import { Connection, PublicKey, clusterApiUrl, type TransactionSignature } from '@solana/web3.js';

export const DEVNET_CLUSTER = 'devnet';

const publicDevnetRpc = clusterApiUrl(DEVNET_CLUSTER);
const configuredRpcUrl = env.PUBLIC_SOLANA_RPC_URL || publicDevnetRpc;

export const connection = new Connection(configuredRpcUrl, 'confirmed');

export async function requestAirdrop(recipient: PublicKey, lamports: number) {
	const response = await fetch(configuredRpcUrl, {
		method: 'POST',
		headers: {
			accept: 'application/json',
			'content-type': 'application/json'
		},
		body: JSON.stringify({
			jsonrpc: '2.0',
			id: crypto.randomUUID(),
			method: 'requestAirdrop',
			params: [recipient.toBase58(), lamports, { commitment: 'processed' }]
		})
	});

	if (!response.ok) {
		throw new Error(`Airdrop RPC request failed with HTTP ${response.status}.`);
	}

	const payload: {
		result?: TransactionSignature;
		error?: { code: number; message: string };
	} = await response.json();

	if (payload.error) {
		throw new Error(`Airdrop RPC error ${payload.error.code}: ${payload.error.message}`);
	}

	if (!payload.result) {
		throw new Error('Airdrop RPC returned no transaction signature.');
	}

	return payload.result;
}

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
