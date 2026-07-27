import { describe, expect, it } from 'vitest';
import { AmountError, formatCompactAmount, fromAtomicAmount, toAtomicAmount } from './amounts';

describe('token amount conversion', () => {
	it('converts human SOL without floating point math', () => {
		expect(toAtomicAmount('1.25', 9)).toBe('1250000000');
	});

	it('supports leading decimal amounts', () => {
		expect(toAtomicAmount('.00001', 5)).toBe('1');
	});

	it('rejects zero, negative, and excess precision', () => {
		expect(() => toAtomicAmount('0', 9)).toThrow(AmountError);
		expect(() => toAtomicAmount('-1', 9)).toThrow(AmountError);
		expect(() => toAtomicAmount('1.000001', 5)).toThrow('up to 5 decimal places');
	});

	it('formats atomic amounts for a receipt', () => {
		expect(fromAtomicAmount('1234500', 6)).toBe('1.2345');
		expect(formatCompactAmount('125000000000', 5)).toBe('1.25M');
	});
});
