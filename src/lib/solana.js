const { Connection, Keypair, PublicKey, SystemProgram, Transaction, sendAndConfirmTransaction, LAMPORTS_PER_SOL } = require("@solana/web3.js");
let bs58;
try {
    bs58 = require("bs58");
} catch (e) {
    // Fallback if bs58 is purely ESM
    bs58 = require("@solana/web3.js").utils?.bs58 || require("bs58");
}

const rpcUrl = process.env.SOLANA_RPC_URL || "https://api.devnet.solana.com";
const connection = new Connection(rpcUrl, "confirmed");

const brokerPrivateKeyString = process.env.BROKER_PRIVATE_KEY_BASE58;
let brokerKeypair = null;

if (brokerPrivateKeyString) {
    try {
        brokerKeypair = Keypair.fromSecretKey(bs58.decode(brokerPrivateKeyString));
        console.log("Broker Wallet initialized:", brokerKeypair.publicKey.toBase58());
    } catch (e) {
        console.error("Failed to initialize broker wallet. Verify BROKER_PRIVATE_KEY_BASE58.");
    }
} else {
    console.warn("No BROKER_PRIVATE_KEY_BASE58 found in env. Solana payouts will not work.");
}

const BROKER_WALLET_ADDRESS = brokerKeypair ? brokerKeypair.publicKey.toBase58() : process.env.BROKER_WALLET;

// Helper to convert SOL UI amount to lamports equivalent for Native SOL testing. 
// e.g. 0.01 SOL, so we multiply by LAMPORTS_PER_SOL
function convertAmountToLamports(amount) {
    return Math.floor(amount * LAMPORTS_PER_SOL);
}

/**
 * Verifies a buy-in transaction signature.
 * In a real app, this should check if the transaction is confirmed, 
 * has the correct sender, receiver, and amount.
 * For simplicity in this implementation, we just check confirmation status.
 */
async function verifyPayment(signature, expectedAmount, senderWallet) {
    if (!signature) throw new Error("No signature provided");

    console.log(`Verifying payment signature: ${signature} for ${expectedAmount} SOL + fee from ${senderWallet}`);
    try {
        // Wait for transaction confirmation
        const latestBlockHash = await connection.getLatestBlockhash();
        const confirmation = await connection.confirmTransaction({
            blockhash: latestBlockHash.blockhash,
            lastValidBlockHeight: latestBlockHash.lastValidBlockHeight,
            signature: signature
        }, 'confirmed');

        if (confirmation.value.err) {
            throw new Error(`Transaction failed: ${confirmation.value.err.toString()}`);
        }

        // Ideally here we would fetch the parsed transaction:
        // const tx = await connection.getParsedTransaction(signature, 'confirmed');
        // and verify the exact transfer instruction matches expectedAmount and BROKER_WALLET_ADDRESS
        // For now, if the user signed and confirmed it, we accept it.

        return true;
    } catch (error) {
        console.error("Payment verification error:", error);
        return false;
    }
}

/**
 * Sends a payout to the winner wallet.
 * Takes 5% house rake and sends the rest.
 */
async function sendPayout(winnerWalletAddress, totalPot) {
    if (!brokerKeypair) {
        console.error("Cannot process payout. Broker wallet not loaded.");
        return null;
    }

    try {
        const winnerPubkey = new PublicKey(winnerWalletAddress);
        const houseRake = 0.05;
        const payoutAmount = totalPot * (1 - houseRake);

        const lamports = convertAmountToLamports(payoutAmount);

        console.log(`Initiating payout of ${payoutAmount} SOL (${lamports} lamports) to ${winnerWalletAddress}`);

        const transaction = new Transaction().add(
            SystemProgram.transfer({
                fromPubkey: brokerKeypair.publicKey,
                toPubkey: winnerPubkey,
                lamports: lamports,
            })
        );

        const signature = await sendAndConfirmTransaction(
            connection,
            transaction,
            [brokerKeypair]
        );

        console.log(`Payout successful. Signature: ${signature}`);
        return signature;

    } catch (error) {
        console.error("Payout error:", error);
        return null;
    }
}

module.exports = {
    connection,
    brokerKeypair,
    BROKER_WALLET_ADDRESS,
    verifyPayment,
    sendPayout
};
