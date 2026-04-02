import React, { useState, useEffect } from 'react'
import { Box, Text, useInput } from 'ink'
import { Connection, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js'
import { rpcUrlForEnv } from '../utils/rpc.js'
import type { Env } from '../config/services.js'
import type { KeypairInfo } from './KeypairSetup.js'

type BalanceState =
  | { type: 'loading' }
  | { type: 'ok'; balance: number }
  | { type: 'error'; message: string }

type AirdropState =
  | { type: 'idle' }
  | { type: 'running' }
  | { type: 'success'; amount: number }
  | { type: 'error'; message: string }

const AIRDROP_SOL = 2

export function WalletFund({
  env,
  keypair,
  onDone,
}: {
  env: Env
  keypair: KeypairInfo
  onDone: () => void
}) {
  const rpcUrl = rpcUrlForEnv(env)
  const pubkey = new PublicKey(keypair.pubkey)
  const [balance, setBalance]   = useState<BalanceState>({ type: 'loading' })
  const [airdrop, setAirdrop]   = useState<AirdropState>({ type: 'idle' })
  const isDevnet = env !== 'prod-mainnet'

  async function fetchBalance() {
    setBalance({ type: 'loading' })
    try {
      const conn = new Connection(rpcUrl, 'confirmed')
      const bal  = await conn.getBalance(pubkey)
      setBalance({ type: 'ok', balance: bal / LAMPORTS_PER_SOL })
    } catch {
      setBalance({ type: 'error', message: `Gagal koneksi ke ${rpcUrl}` })
    }
  }

  async function doAirdrop() {
    if (airdrop.type === 'running') return
    setAirdrop({ type: 'running' })
    try {
      const conn = new Connection(rpcUrl, 'confirmed')
      const sig  = await conn.requestAirdrop(pubkey, AIRDROP_SOL * LAMPORTS_PER_SOL)
      await conn.confirmTransaction(sig, 'confirmed')
      const bal  = await conn.getBalance(pubkey)
      setBalance({ type: 'ok', balance: bal / LAMPORTS_PER_SOL })
      setAirdrop({ type: 'success', amount: AIRDROP_SOL })
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      const isRateLimit = msg.includes('airdrop limit') || msg.includes('rate limit') || msg.includes('429')
      setAirdrop({
        type: 'error',
        message: isRateLimit
          ? 'Rate limited — coba lagi sebentar atau pakai https://faucet.solana.com'
          : msg.slice(0, 80),
      })
    }
  }

  useEffect(() => { fetchBalance() }, [])

  const busy = airdrop.type === 'running' || balance.type === 'loading'

  useInput((input, key) => {
    if (busy) return
    if (input === 'a' && isDevnet) doAirdrop()
    if (input === 'r') fetchBalance()
    if (input === 's' || key.return) onDone()
  })

  const balanceNum = balance.type === 'ok' ? balance.balance : null
  const lowBalance = balanceNum !== null && balanceNum < 0.5

  return (
    <Box flexDirection="column" gap={1} paddingX={2} paddingY={1}>
      {/* Header */}
      <Box flexDirection="column">
        <Text bold color="magenta">⚙  Kinko Setup — Agent Wallet</Text>
        <Text dimColor>Fund agent wallet dengan SOL untuk signing transaksi onchain</Text>
      </Box>

      {/* Wallet info */}
      <Box flexDirection="column" gap={0} borderStyle="round" borderColor="cyan" paddingX={1} paddingY={0}>
        <Text dimColor>Agent Public Key:</Text>
        <Text color="cyan" bold>{keypair.pubkey}</Text>
        <Text dimColor>Network: <Text color="white">{rpcUrl}</Text></Text>
      </Box>

      {/* Balance */}
      <Box gap={2} alignItems="center">
        <Text bold>Balance:</Text>
        {balance.type === 'loading' && <Text color="yellow">⟳ mengecek…</Text>}
        {balance.type === 'ok' && (
          <>
            <Text color={lowBalance ? 'red' : 'green'} bold>
              {balance.balance.toFixed(4)} SOL
            </Text>
            {lowBalance && <Text color="yellow">⚠  rendah</Text>}
          </>
        )}
        {balance.type === 'error' && <Text color="red">✗ gagal cek</Text>}
      </Box>

      {/* Airdrop status */}
      {airdrop.type === 'running'  && <Text color="yellow">⟳ Requesting airdrop {AIRDROP_SOL} SOL…</Text>}
      {airdrop.type === 'success'  && <Text color="green">✓ Airdrop {airdrop.amount} SOL berhasil!</Text>}
      {airdrop.type === 'error'    && (
        <Box flexDirection="column" gap={0}>
          <Text color="red">✗ {airdrop.message}</Text>
          {env === 'dev-devnet' && (
            <Text dimColor>  → Manual: https://faucet.solana.com (paste pubkey di atas)</Text>
          )}
        </Box>
      )}

      {/* Hint untuk prod */}
      {!isDevnet && (
        <Text color="yellow">⚠  Mainnet — transfer SOL manual ke pubkey di atas, lalu tekan r untuk refresh.</Text>
      )}

      {/* Actions */}
      <Box flexDirection="column" gap={0} marginTop={1}>
        {isDevnet && (
          <Text color={busy ? 'gray' : 'cyan'}>  a  Airdrop {AIRDROP_SOL} SOL</Text>
        )}
        <Text color={busy ? 'gray' : undefined}>  r  Refresh balance</Text>
        <Text color={busy ? 'gray' : undefined}>  s / Enter  Lanjut ke konfigurasi →</Text>
      </Box>
    </Box>
  )
}
