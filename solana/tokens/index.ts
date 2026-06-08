import {
  Connection,
  Keypair,
  PublicKey,
  LAMPORTS_PER_SOL,
  clusterApiUrl,
} from '@solana/web3.js';
import {
  createMint,
  getOrCreateAssociatedTokenAccount,
  mintTo,
  TOKEN_PROGRAM_ID,
} from '@solana/spl-token';

const DECIMALS = 6;
const MINT_AMOUNT = 100;

const connection = new Connection(clusterApiUrl('devnet'), 'confirmed');

function loadSecretKeyFromEnv(): Uint8Array {
  const raw = process.env.SOLANA_SECRET_KEY;
  if (!raw) {
    throw new Error(
      'Missing SOLANA_SECRET_KEY. Set it to a JSON array of 64 numbers, for example: [12,34,...].',
    );
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    throw new Error('SOLANA_SECRET_KEY must be valid JSON.', { cause: error });
  }

  if (!Array.isArray(parsed) || parsed.length !== 64) {
    throw new Error('SOLANA_SECRET_KEY must be a JSON array of 64 bytes.');
  }

  if (!parsed.every((value) => Number.isInteger(value) && value >= 0 && value <= 255)) {
    throw new Error('SOLANA_SECRET_KEY values must be integers between 0 and 255.');
  }

  return Uint8Array.from(parsed);
}

const secretKey = loadSecretKeyFromEnv();
const payer = Keypair.fromSecretKey(secretKey);
const mintAuthority = payer;

async function requestAirdrop(publicKey: PublicKey, amount: number): Promise<void> {
  console.log(`Requesting airdrop of ${amount / LAMPORTS_PER_SOL} SOL...`);
  const airdropSignature = await connection.requestAirdrop(publicKey, amount);

  const latestBlockhash = await connection.getLatestBlockhash();
  await connection.confirmTransaction({
    blockhash: latestBlockhash.blockhash,
    lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
    signature: airdropSignature,
  });
  console.log('Airdrop confirmed.');
}

async function createTokenMint(
  payerKeypair: Keypair,
  mintAuthorityPubkey: PublicKey,
  decimals: number,
): Promise<PublicKey> {
  console.log('Creating token mint...');
  const mint = await createMint(
    connection,
    payerKeypair,
    mintAuthorityPubkey,
    null,
    decimals,
    Keypair.generate(),
    undefined,
    TOKEN_PROGRAM_ID,
  );
  console.log(`Mint created at: ${mint.toBase58()}`);
  return mint;
}

async function mintNewTokens(mint: PublicKey, to: PublicKey, amount: number): Promise<void> {
  if (!Number.isInteger(amount) || amount <= 0) {
    throw new Error('Mint amount must be a positive integer.');
  }

  console.log(`Creating associated token account for ${to.toBase58()}...`);
  const tokenAccount = await getOrCreateAssociatedTokenAccount(
    connection,
    payer,
    mint,
    to,
  );
  console.log(`Token account ready at: ${tokenAccount.address.toBase58()}`);

  const rawAmount = BigInt(amount) * 10n ** BigInt(DECIMALS);
  console.log(`Minting ${amount} tokens...`);

  await mintTo(connection, payer, mint, tokenAccount.address, payer, rawAmount);

  console.log(`Minted ${amount} tokens to ${tokenAccount.address.toBase58()}`);
}

async function main(): Promise<void> {
  console.log(`Wallet Address: ${payer.publicKey.toBase58()}`);

  await requestAirdrop(payer.publicKey, LAMPORTS_PER_SOL * 2);
  const mintPublicKey = await createTokenMint(payer, mintAuthority.publicKey, DECIMALS);
  await mintNewTokens(mintPublicKey, mintAuthority.publicKey, MINT_AMOUNT);

  console.log(`View your token on Explorer:`);
  console.log(
    `https://explorer.solana.com/address/${mintPublicKey.toBase58()}?cluster=devnet`,
  );
}

main().catch((error) => {
  console.error('Error executing script:', error);
  process.exitCode = 1;
});
