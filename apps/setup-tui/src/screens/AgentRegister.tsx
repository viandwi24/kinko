import React, { useState, useEffect } from 'react'
import { Box, Text, useInput } from 'ink'
import { resolveFromRoot, writeEnvFile, readEnvFile } from '../utils/env.js'

type Status =
  | { type: 'running' }
  | { type: 'success'; addresses: Record<string, string>; output: string }
  | { type: 'error'; output: string; stderr: string }

// Env vars yang perlu dipass ke subprocess dari values yang sudah diisi user
const PASS_THROUGH = ['OPERATOR_PRIVATE_KEY', 'SOLANA_RPC_URL', 'AGENT_SERVICE_URL']

export function AgentRegister({
  solanaValues,
  selectedServices,
  allValues,
  onDone,
}: {
  solanaValues: Record<string, string>
  selectedServices: string[]
  allValues: Record<string, Record<string, string>>
  onDone: (addresses: Record<string, string>) => void
}) {
  const [status, setStatus] = useState<Status>({ type: 'running' })

  useEffect(() => {
    async function run() {
      const env: Record<string, string> = { ...process.env as Record<string, string> }
      for (const key of PASS_THROUGH) {
        if (solanaValues[key]) env[key] = solanaValues[key]
      }

      try {
        const proc = Bun.spawn(
          ['bun', 'run', 'src/scripts/setup-agent.ts'],
          {
            cwd: resolveFromRoot('packages/solana'),
            env,
            stdout: 'pipe',
            stderr: 'pipe',
          },
        )

        const [stdout, stderr, exitCode] = await Promise.all([
          new Response(proc.stdout).text(),
          new Response(proc.stderr).text(),
          proc.exited,
        ])

        if (exitCode !== 0) {
          setStatus({ type: 'error', output: stdout, stderr })
          return
        }

        // Parse alamat dari output
        const addresses: Record<string, string> = {}
        for (const line of stdout.split('\n')) {
          const match = line.trim().match(/^(AGENT_\w+)=(.+)$/)
          if (match) addresses[match[1]] = match[2].trim()
        }

        // Inject alamat ke env files yang sudah dipilih
        if (addresses.AGENT_ASSET_ADDRESS) {
          // apps/server/.env
          if (selectedServices.includes('server') && allValues.server) {
            const updated = { ...allValues.server, AGENT_A_ASSET_ADDRESS: addresses.AGENT_ASSET_ADDRESS }
            writeEnvFile('apps/server/.env', updated)
          }
          // apps/web/.env.local
          if (selectedServices.includes('web') && allValues.web) {
            const updated = { ...allValues.web, NEXT_PUBLIC_AGENT_ASSET_ADDRESS: addresses.AGENT_ASSET_ADDRESS }
            writeEnvFile('apps/web/.env.local', updated)
          }
        }

        // Inject AGENT_B_WALLET (= AGENT_SIGNER_PDA) ke agent-b kalau belum diisi
        if (addresses.AGENT_SIGNER_PDA && selectedServices.includes('agent-b')) {
          const existing = readEnvFile('apps/agent-b/.env')
          if (!existing.AGENT_B_WALLET) {
            writeEnvFile('apps/agent-b/.env', {
              ...allValues['agent-b'],
              AGENT_B_WALLET: addresses.AGENT_SIGNER_PDA,
            })
          }
        }

        setStatus({ type: 'success', addresses, output: stdout })
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e)
        setStatus({ type: 'error', output: '', stderr: msg })
      }
    }

    run()
  }, [])

  useInput((_input, _key) => {
    if (status.type === 'success') {
      onDone(status.addresses)
    }
    if (status.type === 'error') {
      onDone({})
    }
  }, { isActive: status.type !== 'running' })

  return (
    <Box flexDirection="column" gap={1} paddingX={2} paddingY={1}>
      <Box flexDirection="column">
        <Text bold color="magenta">⚙  Kinko Setup — Metaplex Registry</Text>
        <Text dimColor>Registrasi agent identity ke Metaplex Agent Registry</Text>
      </Box>

      {status.type === 'running' && (
        <Box flexDirection="column" gap={0}>
          <Text color="yellow">⟳  Menjalankan setup-agent.ts…</Text>
          <Text dimColor>  1. Create MPL Core Asset (Kinko)</Text>
          <Text dimColor>  2. Register Identity (ERC-8004)</Text>
          <Text dimColor>  3. Register Executive Profile</Text>
          <Text dimColor>  4. Delegate Execution</Text>
          <Text dimColor>Ini membutuhkan beberapa transaksi onchain, harap tunggu…</Text>
        </Box>
      )}

      {status.type === 'success' && (
        <Box flexDirection="column" gap={1}>
          <Text color="green">✓ Agent berhasil didaftarkan!</Text>
          <Box flexDirection="column" gap={0}>
            <Text bold>Alamat onchain:</Text>
            {Object.entries(status.addresses).map(([k, v]) => (
              <Box key={k} gap={1}>
                <Text color="cyan">  {k}</Text>
                <Text dimColor>=</Text>
                <Text>{v}</Text>
              </Box>
            ))}
          </Box>
          <Text dimColor>
            Alamat sudah otomatis diupdate ke .env files yang relevan.
          </Text>
          <Text dimColor>Enter untuk lanjut</Text>
        </Box>
      )}

      {status.type === 'error' && (
        <Box flexDirection="column" gap={1}>
          <Text color="red">✗ Registrasi gagal</Text>
          {status.stderr && (
            <Box flexDirection="column" gap={0}>
              <Text bold>Error:</Text>
              {status.stderr.split('\n').slice(0, 8).map((line, i) => (
                <Text key={i} color="red" dimColor>  {line}</Text>
              ))}
            </Box>
          )}
          <Box flexDirection="column" gap={0}>
            <Text dimColor>Kemungkinan penyebab:</Text>
            <Text dimColor>  • OPERATOR_PRIVATE_KEY salah format</Text>
            <Text dimColor>  • Tidak ada SOL di operator wallet</Text>
            <Text dimColor>  • RPC tidak dapat dijangkau</Text>
          </Box>
          <Text dimColor>Enter untuk skip (bisa jalankan manual nanti)</Text>
        </Box>
      )}
    </Box>
  )
}
