import type { SignerWalletAdapter } from '@solana/wallet-adapter-base';
import { VersionedTransaction } from '@solana/web3.js';
import { decodeBase64, encodeBase64 } from './base64';
import { executeOrder, requestOrder, SwapApiError } from './client';
import type { JupiterExecuteResult, OrderRequest } from './types';

export type SwapExecutionRequest = Omit<OrderRequest, 'taker'> & {
	wallet: SignerWalletAdapter;
};

export async function signAndExecuteSwap({
	wallet,
	...request
}: SwapExecutionRequest): Promise<JupiterExecuteResult> {
	if (!wallet.publicKey || !wallet.connected) {
		throw new SwapApiError('Connect a wallet before swapping.', 400);
	}

	const order = await requestOrder({ ...request, taker: wallet.publicKey.toBase58() });
	if (!order.transaction) {
		throw new SwapApiError(
			order.errorMessage ?? 'Jupiter found a price but could not build this swap.',
			422,
			order.errorCode
		);
	}

	const transaction = VersionedTransaction.deserialize(decodeBase64(order.transaction));
	const signedTransaction = await wallet.signTransaction(transaction);
	const result = await executeOrder({
		signedTransaction: encodeBase64(signedTransaction.serialize()),
		requestId: order.requestId,
		lastValidBlockHeight: order.lastValidBlockHeight
	});

	if (result.status !== 'Success') {
		throw new SwapApiError(result.error ?? 'The swap did not land on Solana.', 422, result.code);
	}

	return result;
}
