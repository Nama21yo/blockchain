declare module '@svelte-on-solana/wallet-adapter-core' {
	import type { Adapter, WalletName } from '@solana/wallet-adapter-base';
	import type { PublicKey } from '@solana/web3.js';
	import type { Readable } from 'svelte/store';

	interface WalletStore {
		adapter: Adapter | null;
		connected: boolean;
		connecting: boolean;
		disconnecting: boolean;
		publicKey: PublicKey | null;
		wallet: Adapter | null;
		name: WalletName | null;
		connect(): Promise<void>;
		disconnect(): Promise<void>;
		select(walletName: WalletName): void;
	}

	export const walletStore: Readable<WalletStore>;
}
