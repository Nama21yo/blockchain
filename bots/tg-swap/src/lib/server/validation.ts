import { PublicKey } from '@solana/web3.js';
import { SUPPORTED_MINTS } from '$lib/domain/tokens';

export class RequestValidationError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'RequestValidationError';
	}
}

export function validateOrderParameters(parameters: URLSearchParams): URLSearchParams {
	const inputMint = parameters.get('inputMint') ?? '';
	const outputMint = parameters.get('outputMint') ?? '';
	const amount = parameters.get('amount') ?? '';
	const taker = parameters.get('taker');

	if (!SUPPORTED_MINTS.has(inputMint) || !SUPPORTED_MINTS.has(outputMint)) {
		throw new RequestValidationError('Select a supported token.');
	}
	if (inputMint === outputMint) throw new RequestValidationError('Choose two different tokens.');
	if (!/^[1-9]\d{0,29}$/.test(amount)) throw new RequestValidationError('Amount must be a positive integer.');
	if (taker) {
		try {
			new PublicKey(taker);
		} catch {
			throw new RequestValidationError('Wallet address is invalid.');
		}
	}

	const safe = new URLSearchParams({ inputMint, outputMint, amount });
	if (taker) safe.set('taker', taker);
	return safe;
}

export function validateExecuteBody(value: unknown): {
	signedTransaction: string;
	requestId: string;
	lastValidBlockHeight?: number;
} {
	if (!value || typeof value !== 'object') throw new RequestValidationError('Request body is invalid.');
	const body = value as Record<string, unknown>;

	if (
		typeof body.signedTransaction !== 'string' ||
		body.signedTransaction.length < 100 ||
		body.signedTransaction.length > 10_000 ||
		!/^[A-Za-z0-9+/]+=*$/.test(body.signedTransaction)
	) {
		throw new RequestValidationError('Signed transaction is invalid.');
	}
	if (typeof body.requestId !== 'string' || !/^[A-Za-z0-9_-]{8,200}$/.test(body.requestId)) {
		throw new RequestValidationError('Request ID is invalid.');
	}
	if (
		body.lastValidBlockHeight !== undefined &&
		(!Number.isSafeInteger(body.lastValidBlockHeight) || Number(body.lastValidBlockHeight) <= 0)
	) {
		throw new RequestValidationError('Last valid block height is invalid.');
	}

	return {
		signedTransaction: body.signedTransaction,
		requestId: body.requestId,
		...(body.lastValidBlockHeight === undefined
			? {}
			: { lastValidBlockHeight: Number(body.lastValidBlockHeight) })
	};
}
