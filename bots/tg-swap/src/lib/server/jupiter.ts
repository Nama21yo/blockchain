import { env } from '$env/dynamic/private';

const JUPITER_BASE_URL = 'https://api.jup.ag/swap/v2';

export class JupiterServerError extends Error {
	readonly status: number;
	readonly payload: unknown;

	constructor(message: string, status: number, payload?: unknown) {
		super(message);
		this.name = 'JupiterServerError';
		this.status = status;
		this.payload = payload;
	}
}

export async function callJupiter(
	path: string,
	init: RequestInit = {},
	fetcher: typeof fetch = fetch
): Promise<unknown> {
	const apiKey = env.JUPITER_API_KEY;
	if (!apiKey) {
		throw new JupiterServerError('Jupiter is not configured. Add JUPITER_API_KEY to the server.', 503);
	}

	const response = await fetcher(`${JUPITER_BASE_URL}${path}`, {
		...init,
		headers: {
			accept: 'application/json',
			'x-api-key': apiKey,
			...init.headers
		}
	});
	const payload = await response.json().catch(() => null);

	if (!response.ok) {
		const upstreamMessage =
			payload && typeof payload === 'object' && 'error' in payload && typeof payload.error === 'string'
				? payload.error
				: 'Jupiter rejected the request.';
		throw new JupiterServerError(upstreamMessage, response.status, payload);
	}

	return payload;
}
