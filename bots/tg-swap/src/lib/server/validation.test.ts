import { describe, expect, it } from 'vitest';
import { TOKENS } from '$lib/domain/tokens';
import { RequestValidationError, validateExecuteBody, validateOrderParameters } from './validation';

describe('Jupiter proxy validation', () => {
	it('allows a curated quote without a wallet', () => {
		const parameters = new URLSearchParams({
			inputMint: TOKENS.SOL.mint,
			outputMint: TOKENS.BONK.mint,
			amount: '100000000'
		});
		expect(validateOrderParameters(parameters).toString()).toBe(parameters.toString());
	});

	it('rejects unsupported mints and unsafe atomic amounts', () => {
		expect(() =>
			validateOrderParameters(
				new URLSearchParams({ inputMint: 'unknown', outputMint: TOKENS.BONK.mint, amount: '1' })
			)
		).toThrow(RequestValidationError);
		expect(() =>
			validateOrderParameters(
				new URLSearchParams({
					inputMint: TOKENS.SOL.mint,
					outputMint: TOKENS.BONK.mint,
					amount: '1.5'
				})
			)
		).toThrow('positive integer');
	});

	it('accepts a bounded base64 signed transaction', () => {
		const body = {
			signedTransaction: 'A'.repeat(200),
			requestId: 'request_123456',
			lastValidBlockHeight: 300_000_000
		};
		expect(validateExecuteBody(body)).toEqual(body);
	});
});
