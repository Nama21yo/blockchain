declare module '@svelte-on-solana/wallet-adapter-core' {
	import type { Adapter, SendTransactionOptions, WalletName } from '@solana/wallet-adapter-base';
	import type {
		Connection,
		PublicKey,
		Transaction,
		TransactionSignature,
		VersionedTransaction
	} from '@solana/web3.js';
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
		sendTransaction(
			transaction: Transaction | VersionedTransaction,
			connection: Connection,
			options?: SendTransactionOptions
		): Promise<TransactionSignature>;
		signMessage?: (message: Uint8Array) => Promise<Uint8Array>;
	}

	export const walletStore: Readable<WalletStore>;
}
