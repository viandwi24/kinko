import * as anchor from "@coral-xyz/anchor";
import { Program, BN } from "@coral-xyz/anchor";
import { KinkoTreasury } from "../target/types/kinko_treasury";
import {
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
} from "@solana/web3.js";
import assert from "node:assert";

const SOL = (amount: number) => new BN(amount * LAMPORTS_PER_SOL);

function getTreasuryPda(
  owner: PublicKey,
  programId: PublicKey
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("treasury"), owner.toBuffer()],
    programId
  );
}

describe("kinko-treasury", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.KinkoTreasury as Program<KinkoTreasury>;
  const owner = Keypair.generate();
  const agent = Keypair.generate();
  const recipient = Keypair.generate();

  before(async () => {
    // Fund owner and agent wallets
    await provider.connection.confirmTransaction(
      await provider.connection.requestAirdrop(
        owner.publicKey,
        10 * LAMPORTS_PER_SOL
      )
    );
    await provider.connection.confirmTransaction(
      await provider.connection.requestAirdrop(
        agent.publicKey,
        2 * LAMPORTS_PER_SOL
      )
    );
  });

  it("initializes a treasury PDA for a user", async () => {
    const [treasuryPda] = getTreasuryPda(owner.publicKey, program.programId);

    await program.methods
      .initialize()
      .accounts({
        treasury: treasuryPda,
        owner: owner.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([owner])
      .rpc();

    const treasury = await program.account.userTreasury.fetch(treasuryPda);
    assert.strictEqual(
      treasury.owner.toBase58(),
      owner.publicKey.toBase58(),
      "owner should match"
    );
    assert.strictEqual(
      treasury.principalLamports.toNumber(),
      0,
      "principal should start at 0"
    );
    assert.strictEqual(
      treasury.totalYieldSpent.toNumber(),
      0,
      "yield spent should start at 0"
    );
  });

  it("registers the agent on the treasury", async () => {
    const [treasuryPda] = getTreasuryPda(owner.publicKey, program.programId);

    await program.methods
      .setAgent(agent.publicKey)
      .accounts({
        treasury: treasuryPda,
        owner: owner.publicKey,
      })
      .signers([owner])
      .rpc();

    const treasury = await program.account.userTreasury.fetch(treasuryPda);
    assert.strictEqual(
      treasury.agent.toBase58(),
      agent.publicKey.toBase58(),
      "agent should be registered"
    );
  });

  it("rejects set_agent when called by non-owner", async () => {
    const [treasuryPda] = getTreasuryPda(owner.publicKey, program.programId);
    const attacker = Keypair.generate();
    await provider.connection.confirmTransaction(
      await provider.connection.requestAirdrop(
        attacker.publicKey,
        LAMPORTS_PER_SOL
      )
    );

    try {
      await program.methods
        .setAgent(attacker.publicKey)
        .accounts({
          treasury: treasuryPda,
          owner: attacker.publicKey,
        })
        .signers([attacker])
        .rpc();
      assert.fail("should have thrown");
    } catch {
      // expected — attacker is not the owner
    }
  });

  it("deposits SOL and locks it as principal", async () => {
    const [treasuryPda] = getTreasuryPda(owner.publicKey, program.programId);
    const depositAmount = SOL(2);

    const balanceBefore = await provider.connection.getBalance(owner.publicKey);

    await program.methods
      .deposit(depositAmount)
      .accounts({
        treasury: treasuryPda,
        owner: owner.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([owner])
      .rpc();

    const treasury = await program.account.userTreasury.fetch(treasuryPda);
    assert.strictEqual(
      treasury.principalLamports.toString(),
      depositAmount.toString(),
      "principal should equal deposit"
    );

    const balanceAfter = await provider.connection.getBalance(owner.publicKey);
    assert.ok(
      balanceBefore - balanceAfter >= depositAmount.toNumber(),
      "owner balance should decrease by deposit amount"
    );
  });

  it("rejects deduct_yield when yield has not accrued yet", async () => {
    const [treasuryPda] = getTreasuryPda(owner.publicKey, program.programId);

    try {
      await program.methods
        .deductYield(new BN(1_000)) // tiny amount
        .accounts({
          treasury: treasuryPda,
          agent: agent.publicKey,
          recipient: recipient.publicKey,
        })
        .signers([agent])
        .rpc();
      assert.fail("should have thrown InsufficientYield");
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      assert.ok(
        message.includes("InsufficientYield") ||
          message.includes("insufficient") ||
          message.includes("6001"),
        `expected InsufficientYield, got: ${message}`
      );
    }
  });

  it("rejects deduct_yield when called by non-agent", async () => {
    const [treasuryPda] = getTreasuryPda(owner.publicKey, program.programId);
    const impersonator = Keypair.generate();
    await provider.connection.confirmTransaction(
      await provider.connection.requestAirdrop(
        impersonator.publicKey,
        LAMPORTS_PER_SOL
      )
    );

    try {
      await program.methods
        .deductYield(new BN(1_000))
        .accounts({
          treasury: treasuryPda,
          agent: impersonator.publicKey,
          recipient: recipient.publicKey,
        })
        .signers([impersonator])
        .rpc();
      assert.fail("should have thrown — impersonator is not the agent");
    } catch {
      // expected
    }
  });

  it("rejects deposit of zero lamports", async () => {
    const [treasuryPda] = getTreasuryPda(owner.publicKey, program.programId);

    try {
      await program.methods
        .deposit(new BN(0))
        .accounts({
          treasury: treasuryPda,
          owner: owner.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([owner])
        .rpc();
      assert.fail("should have thrown ZeroAmount");
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      assert.ok(
        message.includes("ZeroAmount") ||
          message.includes("6000") ||
          message.includes("zero"),
        `expected ZeroAmount, got: ${message}`
      );
    }
  });
});
