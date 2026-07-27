import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { callJupiter, JupiterServerError } from '$lib/server/jupiter';
import { RequestValidationError, validateExecuteBody } from '$lib/server/validation';

export const POST: RequestHandler = async ({ request, fetch }) => {
	try {
		const body = validateExecuteBody(await request.json());
		return json(
			await callJupiter(
				'/execute',
				{
					method: 'POST',
					headers: { 'content-type': 'application/json' },
					body: JSON.stringify(body)
				},
				fetch
			)
		);
	} catch (error) {
		if (error instanceof RequestValidationError) return json({ message: error.message }, { status: 400 });
		if (error instanceof JupiterServerError) {
			return json({ message: error.message }, { status: error.status });
		}
		return json({ message: 'Execution service is temporarily unavailable.' }, { status: 502 });
	}
};
