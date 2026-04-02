import React, { useState, useEffect } from 'react'
import { Box, Text, useInput } from 'ink'
import { Connection, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js'
import { rpcUrlForEnv } from '../utils/rpc.js'
import type { Env } from '../config/services.js'
import type { KeypairInfo } from './KeypairSetup.js'

type Status =
  | { type: 'loading' }
  | { type: 'ready'; balance: number }
  | { type: 'airdropping' }
  | { type: 'success'; balance: number }
  | { type: 'error'; message: string }

const AIRDROP_SOL = 2

export function AirdropSetup({
  env,
  keypair,
  onDone,
}: {
  env: Env
  keypair: KeypairInfo
  onDone: () => void
}) {
  const [status, setStatus] = useState<Status>({ type: 'loading' })
  const rpcUrl = rpcUrlForEnv(env)
  const pubkey = new PublicKey(keypair.pubkey)

  async function fetchBalance() {
    try {
      const conn = new Connection(rpcUrl, 'confirmed')
      const bal  = await conn.getBalance(pubkey)
      setStatus({ type: 'ready', balance: bal / LAMPORTS_PER_SOL })
    } catch (e) {
      setStatus({ type: 'error', message: `Gagal koneksi ke ${rpcUrl}` })
    }
  }

  async function requestAirdrop() {
    setStatus({ type: 'airdropping' })
    try {
      const conn = new Connection(rpcUrl, 'confirmed')
      const sig  = await conn.requestAirdrop(pubkey, AIRDROP_SOL * LAMPORTS_PER_SOL)
      await conn.confirmTransaction(sig, 'confirmed')
      const bal  = await conn.getBalance(pubkey)
      setStatus({ type: 'success', balance: bal / LAMPORTS_PER_SOL })
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      if (msg.includes('airdrop limit') || msg.includes('rate limit')) {
        setStatus({ type: 'error', message: 'Rate limited — coba lagi sebentar atau pakai https://faucet.solana.com' })
      } else {
        setStatus({ type: 'error', message: msg.slice(0, 100) })
      }
    }
  }

  useEffect(() => { fetchBalance() }, [])

  const isDevnet  = env === 'dev-devnet'
  const network   = env === 'dev-local' ? 'Localnet' : 'Devnet'

  useInput((input, key) => {
    if (status.type === 'loading' || status.type === 'airdropping') return

    if (input === 'a' && status.type !== 'airdropping') {
      requestAirdrop()
    }
    if (input === 's' || key.return) {
      onDone()
    }
    if (input === 'r' && (status.type === 'error' || status.type === 'success')) {
      fetchBalance()
    }
  })

  return (
    <Box flexDirection="column" gap={1} paddingX={2} paddingY={1}>
      <Box flexDirection="column">
        <Text bold color="magenta">⚙  Kinko Setup — Airdrop</Text>
        <Text>
          Network: <Text color="cyan">{network}</Text>
          {'  '}RPC: <Text dimColor>{rpcUrl}</Text>
        </Text>
      </Box>

      <Box flexDirection="column" gap={0}>
        <Text bold>Agent Wallet:</Text>
        <Text color="cyan">  {keypair.pubkey}</Text>
      </Box>

      {status.type === 'loading' && (
        <Text color="yellow">⟳ Mengecek balance…</Text>
      )}

      {status.type === 'ready' && (
        <Box flexDirection="column" gap={1}>
          <Text>
            Balance: <Text color={status.balance < 0.5 ? 'red' : 'green'} bold>
              {status.balance.toFixed(4)} SOL
            </Text>
            {status.balance < 0.5 && <Text color="yellow">  ← perlu top-up</Text>}
          </Text>
          <Box flexDirection="column" gap={0}>
            <Text bold>Aksi:</Text>
            <Text color="cyan">  a  Request airdrop {AIRDROP_SOL} SOL</Text>
            <Text>  s  Skip / lanjut ke setup</Text>
          </Box>
        </Box>
      )}

      {status.type === 'airdropping' && (
        <Text color="yellow">⟳ Requesting airdrop {AIRDROP_SOL} SOL… (konfirmasi onchain)</Text>
      )}

      {status.type === 'success' && (
        <Box flexDirection="column" gap={1}>
          <Text color="green">✓ Airdrop berhasil!</Text>
          <Text>Balance sekarang: <Text color="green" bold>{status.balance.toFixed(4)} SOL</Text></Text>
          <Box flexDirection="column" gap={0}>
            <Text color="cyan">  a  Airdrop lagi</Text>
            <Text>  s / Enter  Lanjut ke setup</Text>
          </Box>
        </Box>
      )}

      {status.type === 'error' && (
        <Box flexDirection="column" gap={1}>
          <Text color="red">✗ {status.message}</Text>
          {isDevnet && (
            <Text dimColor>  Alternatif: https://faucet.solana.com (paste pubkey di atas)</Text>
          )}
          <Box flexDirection="column" gap={0}>
            <Text color="cyan">  r  Coba lagi</Text>
            <Text>  s / Enter  Skip, lanjut ke setup</Text>
          </Box>
        </Box>
      )}
    </Box>
  )
}
