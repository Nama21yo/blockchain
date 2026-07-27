const DECIMAL_INPUT = /^(?:\d+\.?\d*|\.\d+)$/;

export class AmountError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'AmountError';
	}
}

export function toAtomicAmount(value: string, decimals: number): string {
	const normalized = value.trim();
	if (!DECIMAL_INPUT.test(normalized)) {
		throw new AmountError('Enter a valid token amount.');
	}

	const [whole = '0', fraction = ''] = normalized.split('.');
	if (fraction.length > decimals) {
		throw new AmountError(`This token supports up to ${decimals} decimal places.`);
	}

	const atomic = `${whole || '0'}${fraction.padEnd(decimals, '0')}`.replace(/^0+(?=\d)/, '');
	if (BigInt(atomic) <= 0n) {
		throw new AmountError('Amount must be greater than zero.');
	}

	return atomic;
}

export function fromAtomicAmount(value: string, decimals: number, maximumFractionDigits = decimals): string {
	if (!/^\d+$/.test(value)) throw new AmountError('Atomic amount must be a positive integer.');

	const padded = value.padStart(decimals + 1, '0');
	const whole = padded.slice(0, -decimals) || '0';
	const fraction = decimals === 0 ? '' : padded.slice(-decimals);
	const visibleFraction = fraction.slice(0, maximumFractionDigits).replace(/0+$/, '');

	return visibleFraction ? `${whole}.${visibleFraction}` : whole;
}

export function formatCompactAmount(value: string, decimals: number): string {
	const amount = Number(fromAtomicAmount(value, decimals));
	if (!Number.isFinite(amount)) return '—';

	return new Intl.NumberFormat('en-US', {
		maximumFractionDigits: amount >= 1_000 ? 2 : amount >= 1 ? 4 : 8,
		notation: amount >= 1_000_000 ? 'compact' : 'standard'
	}).format(amount);
}
