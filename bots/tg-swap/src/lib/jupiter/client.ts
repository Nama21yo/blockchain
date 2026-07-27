import type { ExecuteRequest, JupiterExecuteResult, JupiterOrder, OrderRequest } from './types';

export class SwapApiError extends Error {
	readonly status: number;
	readonly code?: number;

	constructor(message: string, status = 500, code?: number) {
		super(message);
		this.name = 'SwapApiError';
		this.status = status;
		this.code = code;
	}
}

async function parseResponse<T>(response: Response): Promise<T> {
	const payload = (await response.json().catch(() => null)) as
		| (T & { message?: string; error?: string; code?: number })
		| null;

	if (!response.ok) {
		throw new SwapApiError(
			payload?.message ?? payload?.error ?? 'Jupiter could not complete this request.',
			response.status,
			payload?.code
		);
	}

	if (!payload) throw new SwapApiError('Jupiter returned an unreadable response.');
	return payload;
}

export async function requestOrder(request: OrderRequest, signal?: AbortSignal): Promise<JupiterOrder> {
	const params = new URLSearchParams({
		inputMint: request.inputMint,
		outputMint: request.outputMint,
		amount: request.amount
	});
	if (request.taker) params.set('taker', request.taker);

	return parseResponse<JupiterOrder>(
		await fetch(`/api/jupiter/order?${params.toString()}`, { signal })
	);
}

export async function executeOrder(request: ExecuteRequest): Promise<JupiterExecuteResult> {
	return parseResponse<JupiterExecuteResult>(
		await fetch('/api/jupiter/execute', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify(request)
		})
	);
}
