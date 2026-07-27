import type { SignerWalletAdapter } from '@solana/wallet-adapter-base';
import { PhantomWalletAdapter } from '@solana/wallet-adapter-phantom';
import { SolflareWalletAdapter } from '@solana/wallet-adapter-solflare';

export function createWalletAdapters(): SignerWalletAdapter[] {
	return [new PhantomWalletAdapter(), new SolflareWalletAdapter()];
}

export function shortAddress(address: string): string {
	return `${address.slice(0, 4)}…${address.slice(-4)}`;
}
