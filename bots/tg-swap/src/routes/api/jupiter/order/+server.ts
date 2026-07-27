import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { callJupiter, JupiterServerError } from '$lib/server/jupiter';
import { RequestValidationError, validateOrderParameters } from '$lib/server/validation';

export const GET: RequestHandler = async ({ url, fetch }) => {
	try {
		const parameters = validateOrderParameters(url.searchParams);
		return json(await callJupiter(`/order?${parameters.toString()}`, {}, fetch));
	} catch (error) {
		if (error instanceof RequestValidationError) return json({ message: error.message }, { status: 400 });
		if (error instanceof JupiterServerError) {
			return json({ message: error.message }, { status: error.status });
		}
		return json({ message: 'Quote service is temporarily unavailable.' }, { status: 502 });
	}
};
