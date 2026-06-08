import {
  Connection,
  Keypair,
  PublicKey,
  clusterApiUrl,
  SystemProgram,
  Transaction,
  sendAndConfirmTransaction,
} from '@solana/web3.js';
import {
  TOKEN_2022_PROGRAM_ID,
  ExtensionType,
  createInitializeMintInstruction,
  createInitializeMetadataPointerInstruction,
  getMintLen,
  TYPE_SIZE,
  LENGTH_SIZE,
  getOrCreateAssociatedTokenAccount,
  mintTo,
} from '@solana/spl-token';
import { createInitializeInstruction, pack } from '@solana/spl-token-metadata';

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

async function main(): Promise<void> {
  console.log(`Wallet connected: ${payer.publicKey.toBase58()}`);

  // 1. Define the Token Identity (Native Metadata)
  const mintKeypair = Keypair.generate();
  const metadata = {
    mint: mintKeypair.publicKey,
    name: 'My Modern Token',
    symbol: 'MOD',
    uri: 'https://raw.githubusercontent.com/solana-developers/program-examples/new-examples/tokens/tokens-and-minting/token-2022/frontend/public/metadata.json',
    additionalMetadata: [], // You can add custom key-value pairs here!
  };

  console.log(`\nPreparing to launch: ${metadata.name} (${metadata.symbol})`);

  // 2. SVM Memory & Rent Calculation
  // We must calculate the EXACT byte size to satisfy SVM modification rules
  const mintLen = getMintLen([ExtensionType.MetadataPointer]);
  const metadataLen = TYPE_SIZE + LENGTH_SIZE + pack(metadata).length;
  const totalBytes = mintLen + metadataLen;

  // Calculate the rent required to satisfy the "RentExempt" rule
  const lamports = await connection.getMinimumBalanceForRentExemption(totalBytes);

  // 3. Construct the Atomic Transaction
  const transaction = new Transaction().add(
    // Step A: The System Program creates the file and assigns ownership
    SystemProgram.createAccount({
      fromPubkey: payer.publicKey,
      newAccountPubkey: mintKeypair.publicKey,
      space: mintLen, // Allocate base space
      lamports: lamports, // Deposit rent
      programId: TOKEN_2022_PROGRAM_ID, // Transfer ownership to Token-2022
    }),
    // Step B: Tell the mint where to look for Metadata (Pointing at itself)
    createInitializeMetadataPointerInstruction(
      mintKeypair.publicKey,
      payer.publicKey, // Update Authority
      mintKeypair.publicKey, // Metadata Address
      TOKEN_2022_PROGRAM_ID,
    ),
    // Step C: Initialize the basic supply/decimal rules
    createInitializeMintInstruction(
      mintKeypair.publicKey,
      DECIMALS,
      payer.publicKey, // Mint Authority
      null, // Freeze Authority
      TOKEN_2022_PROGRAM_ID,
    ),
    // Step D: Write the actual Name, Symbol, and URI into the TLV bytes
    createInitializeInstruction({
      programId: TOKEN_2022_PROGRAM_ID,
      mint: mintKeypair.publicKey,
      metadata: mintKeypair.publicKey,
      name: metadata.name,
      symbol: metadata.symbol,
      uri: metadata.uri,
      mintAuthority: payer.publicKey,
      updateAuthority: payer.publicKey,
    }),
  );

  // 4. Send the Transaction
  // We use Gulf Stream to send it to the leader with a recentBlockhash
  const { blockhash } = await connection.getLatestBlockhash();
  transaction.recentBlockhash = blockhash;
  transaction.feePayer = payer.publicKey;

  console.log('\nSending transaction to create the Mint...');
  const txSignature = await sendAndConfirmTransaction(
    connection,
    transaction,
    [payer, mintKeypair], // Both must sign!
    { commitment: 'confirmed' },
  );
  console.log(`✅ Mint created! Signature: ${txSignature}`);
  console.log(
    `Explorer: https://explorer.solana.com/address/${mintKeypair.publicKey.toBase58()}?cluster=devnet`,
  );

  // 5. Create the Associated Token Account (PDA)
  console.log('\nCalculating PDA for the Associated Token Account...');
  const ata = await getOrCreateAssociatedTokenAccount(
    connection,
    payer,
    mintKeypair.publicKey,
    payer.publicKey,
    false,
    'confirmed',
    { commitment: 'confirmed' },
    TOKEN_2022_PROGRAM_ID, // MUST specify the 2022 program!
  );
  console.log(`✅ ATA ready at: ${ata.address.toBase58()}`);

  // 6. Print the Money
  console.log(`\nMinting ${MINT_AMOUNT} ${metadata.symbol}...`);
  const rawAmount = BigInt(MINT_AMOUNT) * 10n ** BigInt(DECIMALS);

  await mintTo(
    connection,
    payer,
    mintKeypair.publicKey,
    ata.address,
    payer,
    rawAmount,
    [],
    { commitment: 'confirmed' },
    TOKEN_2022_PROGRAM_ID, // MUST specify the 2022 program!
  );

  console.log(`✅ Success! You now own ${MINT_AMOUNT} ${metadata.symbol}.`);
}

main().catch((error) => {
  console.error('❌ Error executing script:', error);
  process.exitCode = 1;
});
