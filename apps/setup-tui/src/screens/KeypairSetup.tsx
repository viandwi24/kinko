import React, { useState } from 'react'
import { Box, Text, useInput } from 'ink'
import TextInput from 'ink-text-input'
import { Keypair } from '@solana/web3.js'

export type KeypairInfo = {
  pubkey: string
  secretKeyJson: string // "[1,2,3,...]" — siap masuk ke env
}

type Mode = 'select' | 'generated' | 'paste'

const OPTIONS = [
  { label: 'Generate keypair baru',       value: 'generate' as const },
  { label: 'Pakai keypair yang sudah ada', value: 'existing' as const },
]

export function KeypairSetup({
  onDone,
}: {
  onDone: (info: KeypairInfo) => void
}) {
  const [mode, setMode]       = useState<Mode>('select')
  const [cursor, setCursor]   = useState(0)
  const [generated, setGenerated] = useState<KeypairInfo | null>(null)
  const [pasteValue, setPasteValue] = useState('')
  const [pasteError, setPasteError] = useState('')

  // ── Select mode ──────────────────────────────────────────────
  useInput((input, key) => {
    if (mode !== 'select') return
    if (key.upArrow)   setCursor(c => Math.max(0, c - 1))
    if (key.downArrow) setCursor(c => Math.min(OPTIONS.length - 1, c + 1))
    if (key.return) {
      if (OPTIONS[cursor].value === 'generate') {
        const kp = Keypair.generate()
        const info: KeypairInfo = {
          pubkey: kp.publicKey.toBase58(),
          secretKeyJson: JSON.stringify(Array.from(kp.secretKey)),
        }
        setGenerated(info)
        setMode('generated')
      } else {
        setMode('paste')
      }
    }
    if (input === 'q' || key.escape) process.exit(0)
  }, { isActive: mode === 'select' })

  // ── Generated — tekan Enter untuk lanjut ─────────────────────
  useInput((_input, key) => {
    if (mode !== 'generated' || !generated) return
    if (key.return) onDone(generated)
  }, { isActive: mode === 'generated' })

  // ── Paste — submit saat Enter ─────────────────────────────────
  function handlePasteSubmit(val: string) {
    try {
      const arr = JSON.parse(val) as number[]
      if (!Array.isArray(arr) || arr.length !== 64) {
        setPasteError('Format salah — harus JSON array 64 bytes')
        return
      }
      const kp = Keypair.fromSecretKey(Uint8Array.from(arr))
      onDone({ pubkey: kp.publicKey.toBase58(), secretKeyJson: val.trim() })
    } catch {
      setPasteError('JSON tidak valid — pastikan format [1,2,3,...]')
    }
  }

  // ── Render ────────────────────────────────────────────────────
  return (
    <Box flexDirection="column" gap={1} paddingX={2} paddingY={1}>
      <Box flexDirection="column">
        <Text bold color="magenta">⚙  Kinko Setup — Keypair</Text>
        <Text dimColor>Agent butuh keypair Solana untuk signing transaksi</Text>
      </Box>

      {mode === 'select' && (
        <Box flexDirection="column" gap={0}>
          <Text bold>Pilih opsi:</Text>
          {OPTIONS.map((opt, i) => (
            <Text key={opt.value} color={i === cursor ? 'cyan' : undefined}>
              {i === cursor ? '▶' : ' '} {opt.label}
            </Text>
          ))}
          <Box marginTop={1}>
            <Text dimColor>↑↓ navigasi  Enter pilih  q keluar</Text>
          </Box>
        </Box>
      )}

      {mode === 'generated' && generated && (
        <Box flexDirection="column" gap={1}>
          <Text color="green">✓ Keypair berhasil di-generate!</Text>
          <Box flexDirection="column" gap={0}>
            <Text bold>Public Key:</Text>
            <Text color="cyan">  {generated.pubkey}</Text>
          </Box>
          <Box flexDirection="column" gap={0}>
            <Text bold>Secret Key (JSON):</Text>
            <Text color="yellow" dimColor>  {generated.secretKeyJson.slice(0, 40)}…</Text>
            <Text dimColor>  (akan otomatis diisi ke AGENT_PRIVATE_KEY dan OPERATOR_PRIVATE_KEY)</Text>
          </Box>
          <Text dimColor>Enter untuk lanjut</Text>
        </Box>
      )}

      {mode === 'paste' && (
        <Box flexDirection="column" gap={1}>
          <Box flexDirection="column" gap={0}>
            <Text bold>Paste secret key (JSON byte array):</Text>
            <Text dimColor>  Format: [1,2,3,...] — 64 bytes</Text>
            <Text dimColor>  Cara dapat: cat keypair.json | tr -d '\n'</Text>
          </Box>
          <Box gap={1}>
            <Text bold color="cyan">›</Text>
            <TextInput
              value={pasteValue}
              onChange={setPasteValue}
              onSubmit={handlePasteSubmit}
              placeholder="[1,2,3,...]"
              mask="*"
            />
          </Box>
          {pasteError && <Text color="red">✗ {pasteError}</Text>}
        </Box>
      )}
    </Box>
  )
}
