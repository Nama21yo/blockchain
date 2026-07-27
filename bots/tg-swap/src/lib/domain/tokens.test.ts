import { describe, expect, it } from 'vitest';
import { PublicKey } from '@solana/web3.js';
import { TOKENS } from './tokens';

describe('curated mainnet tokens', () => {
	it('uses Jupiter-verified BONK metadata', () => {
		expect(TOKENS.BONK.mint).toBe('DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263');
		expect(TOKENS.BONK.decimals).toBe(5);
	});

	it.each(Object.values(TOKENS))('$symbol has a valid Solana public key', (token) => {
		expect(new PublicKey(token.mint).toBase58()).toBe(token.mint);
	});
});
