export type JupiterPlatformFee = {
	amount: string;
	feeBps: number;
	feeMint: string;
};

export type JupiterOrder = {
	inAmount: string;
	outAmount: string;
	inputMint: string;
	outputMint: string;
	transaction: string | null;
	requestId: string;
	router: string;
	mode: 'ultra' | 'manual';
	feeBps: number;
	feeMint: string;
	priceImpactPct?: string;
	platformFee?: JupiterPlatformFee | null;
	lastValidBlockHeight?: number;
	expireAt?: string;
	errorCode?: number;
	errorMessage?: string;
};

export type JupiterExecuteResult = {
	status: 'Success' | 'Failed';
	signature: string;
	code: number;
	totalInputAmount: string;
	totalOutputAmount: string;
	inputAmountResult: string;
	outputAmountResult: string;
	error?: string;
};

export type OrderRequest = {
	inputMint: string;
	outputMint: string;
	amount: string;
	taker?: string;
};

export type ExecuteRequest = {
	signedTransaction: string;
	requestId: string;
	lastValidBlockHeight?: number;
};
