use solana_client::rpc_client::RpcClient;
use solana_sdk::{
    commitment_config::CommitmentConfig,
    signature::{Keypair, Signer},
    system_instruction,
    transaction::Transaction,
};
use spl_associated_token_account::{
    get_associated_token_address_with_program_id, instruction as ata_instruction,
};
use spl_token_2022::{extension::ExtensionType, instruction as token_instruction, state::Mint};
use spl_token_metadata_interface::instruction as metadata_instruction;
use std::env;

const DECIMALS: u8 = 6;
const MINT_AMOUNT: u64 = 100;

fn load_secret_key_from_env() -> Keypair {
    let raw = env::var("SOLANA_SECRET_KEY")
        .expect("Missing SOLANA_SECRET_KEY. Set it to a JSON array of 64 numbers.");
    let parsed: Vec<u8> =
        serde_json::from_str(&raw).expect("SOLANA_SECRET_KEY must be a valid JSON array.");
    assert_eq!(
        parsed.len(),
        64,
        "SOLANA_SECRET_KEY must be exactly 64 bytes."
    );
    Keypair::from_bytes(&parsed).expect("Invalid Keypair bytes")
}

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let payer = load_secret_key_from_env();
    println!("Wallet connected: {}", payer.pubkey());

    let rpc_url = "https://api.devnet.solana.com";
    let client = RpcClient::new_with_commitment(rpc_url, CommitmentConfig::confirmed());

    // 1. Define the Token Identity (Native Metadata)
    let mint_keypair = Keypair::new();
    let mint_pubkey = mint_keypair.pubkey();

    let name = "My Modern Token".to_string();
    let symbol = "MOD".to_string();
    let uri = "https://raw.githubusercontent.com/solana-developers/program-examples/new-examples/tokens/tokens-and-minting/token-2022/frontend/public/metadata.json".to_string();

    println!("\nPreparing to launch: {} ({})", name, symbol);

    // 2. SVM Memory & Rent Calculation
    // Base mint size + MetadataPointer size
    let mint_space =
        ExtensionType::try_calculate_account_len::<Mint>(&[ExtensionType::MetadataPointer])
            .unwrap();

    // Calculate Metadata TLV size (Type size + Length size + pack(metadata).length)
    // The TokenMetadata struct encodes:
    // update_authority (32 bytes option) + mint (32 bytes) + name (4+len) + symbol (4+len) + uri (4+len) + additional_metadata (4 for vector len)
    let metadata_space = 32 + // update_authority (OptionalNonZeroPubkey)
        32 + // mint (Pubkey)
        4 + name.len() + // name length prefix + string
        4 + symbol.len() + // symbol length prefix + string
        4 + uri.len() + // uri length prefix + string
        4; // additional_metadata vector length prefix (empty = 4 bytes)

    // Type + Length sizes for TLV structure in Token-2022
    const TYPE_SIZE: usize = 2;
    const LENGTH_SIZE: usize = 2;
    let total_space = mint_space + TYPE_SIZE + LENGTH_SIZE + metadata_space;

    let lamports = client.get_minimum_balance_for_rent_exemption(total_space)?;

    let mut instructions = Vec::new();

    // Step A: The System Program creates the file and assigns ownership
    instructions.push(system_instruction::create_account(
        &payer.pubkey(),
        &mint_pubkey,
        lamports,
        total_space as u64,
        &spl_token_2022::id(),
    ));

    // Step B: Tell the mint where to look for Metadata (Pointing at itself)
    instructions.push(
        spl_token_2022::extension::metadata_pointer::instruction::initialize(
            &spl_token_2022::id(),
            &mint_pubkey,
            Some(payer.pubkey()),
            Some(mint_pubkey),
        )?,
    );

    // Step C: Initialize the basic supply/decimal rules
    instructions.push(token_instruction::initialize_mint2(
        &spl_token_2022::id(),
        &mint_pubkey,
        &payer.pubkey(),
        None,
        DECIMALS,
    )?);

    // Step D: Write the actual Name, Symbol, and URI into the TLV bytes
    instructions.push(metadata_instruction::initialize(
        &spl_token_2022::id(),
        &mint_pubkey,
        &payer.pubkey(),
        &mint_pubkey,
        &payer.pubkey(),
        name.clone(),
        symbol.clone(),
        uri.clone(),
    ));

    // 4. Send the Transaction
    let recent_blockhash = client.get_latest_blockhash()?;
    let transaction = Transaction::new_signed_with_payer(
        &instructions,
        Some(&payer.pubkey()),
        &[&payer, &mint_keypair],
        recent_blockhash,
    );

    println!("\nSending transaction to create the Mint...");
    let tx_signature = client.send_and_confirm_transaction(&transaction)?;
    println!("✅ Mint created! Signature: {}", tx_signature);
    println!(
        "Explorer: https://explorer.solana.com/address/{}?cluster=devnet",
        mint_pubkey
    );

    // 5. Create the Associated Token Account (PDA)
    println!("\nCalculating PDA for the Associated Token Account...");
    let ata = get_associated_token_address_with_program_id(
        &payer.pubkey(),
        &mint_pubkey,
        &spl_token_2022::id(),
    );

    let ata_instruction = ata_instruction::create_associated_token_account(
        &payer.pubkey(),
        &payer.pubkey(),
        &mint_pubkey,
        &spl_token_2022::id(),
    );

    let ata_tx = Transaction::new_signed_with_payer(
        &[ata_instruction],
        Some(&payer.pubkey()),
        &[&payer],
        client.get_latest_blockhash()?,
    );

    // Note: in a robust script you'd check if the ATA exists first.
    // For this example, since we just created the mint, the ATA definitely does not exist.
    client.send_and_confirm_transaction(&ata_tx)?;
    println!("✅ ATA ready at: {}", ata);

    // 6. Print the Money
    println!("\nMinting {} {}...", MINT_AMOUNT, symbol);
    let raw_amount = MINT_AMOUNT * 10_u64.pow(DECIMALS as u32);

    let mint_to_instruction = token_instruction::mint_to(
        &spl_token_2022::id(),
        &mint_pubkey,
        &ata,
        &payer.pubkey(),
        &[],
        raw_amount,
    )?;

    let mint_tx = Transaction::new_signed_with_payer(
        &[mint_to_instruction],
        Some(&payer.pubkey()),
        &[&payer],
        client.get_latest_blockhash()?,
    );

    client.send_and_confirm_transaction(&mint_tx)?;
    println!("✅ Success! You now own {} {}.", MINT_AMOUNT, symbol);

    Ok(())
}
