export type TokenSymbol = 'SOL' | 'BONK' | 'USDC';

export type SwapToken = {
	symbol: TokenSymbol;
	name: string;
	mint: string;
	decimals: number;
	color: string;
};

export const TOKENS: Record<TokenSymbol, SwapToken> = {
	SOL: {
		symbol: 'SOL',
		name: 'Solana',
		mint: 'So11111111111111111111111111111111111111112',
		decimals: 9,
		color: '#7357f6'
	},
	BONK: {
		symbol: 'BONK',
		name: 'Bonk',
		mint: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6fTtfH1qQQNZv3H',
		decimals: 5,
		color: '#ff6b4a'
	},
	USDC: {
		symbol: 'USDC',
		name: 'USD Coin',
		mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
		decimals: 6,
		color: '#2775ca'
	}
};

export const TOKEN_LIST = Object.values(TOKENS);
export const SUPPORTED_MINTS = new Set(TOKEN_LIST.map((token) => token.mint));

export function tokenByMint(mint: string): SwapToken | undefined {
	return TOKEN_LIST.find((token) => token.mint === mint);
}
