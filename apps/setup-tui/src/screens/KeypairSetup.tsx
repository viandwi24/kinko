import React, { useState, useEffect } from 'react'
import { Box, Text, useInput } from 'ink'
import TextInput from 'ink-text-input'
import { Keypair } from '@solana/web3.js'
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs'
import { resolveFromRoot } from '../utils/env.js'

export type KeypairInfo = {
  pubkey: string
  secretKeyJson: string // "[1,2,3,...]"
}

type Mode = 'select' | 'generated' | 'paste'

const KEYPAIR_FILE = 'data/agent-keypair.json'

function loadExistingKeypair(): KeypairInfo | null {
  const path = resolveFromRoot(KEYPAIR_FILE)
  if (!existsSync(path)) return null
  try {
    const raw = readFileSync(path, 'utf-8')
    const arr = JSON.parse(raw) as number[]
    const kp = Keypair.fromSecretKey(Uint8Array.from(arr))
    return { pubkey: kp.publicKey.toBase58(), secretKeyJson: JSON.stringify(arr) }
  } catch {
    return null
  }
}

function saveKeypair(secretKeyJson: string) {
  mkdirSync(resolveFromRoot('data'), { recursive: true })
  writeFileSync(resolveFromRoot(KEYPAIR_FILE), secretKeyJson, 'utf-8')
}

const OPTIONS = [
  { label: 'Generate keypair baru',        value: 'generate' as const },
  { label: 'Pakai keypair yang sudah ada', value: 'existing' as const },
]

export function KeypairSetup({ onDone }: { onDone: (info: KeypairInfo) => void }) {
  const [mode, setMode]           = useState<Mode>('select')
  const [cursor, setCursor]       = useState(0)
  const [generated, setGenerated] = useState<KeypairInfo | null>(null)
  const [existing, setExisting]   = useState<KeypairInfo | null>(null)
  const [pasteValue, setPasteValue] = useState('')
  const [pasteError, setPasteError] = useState('')

  useEffect(() => {
    setExisting(loadExistingKeypair())
  }, [])

  // ── Select mode ──────────────────────────────────────────────
  useInput((input, key) => {
    if (mode !== 'select') return
    if (key.upArrow)   setCursor(c => Math.max(0, c - 1))
    if (key.downArrow) setCursor(c => Math.min(OPTIONS.length - 1, c + 1))
    if (key.return) {
      if (OPTIONS[cursor].value === 'generate') {
        const kp = Keypair.generate()
        const secretKeyJson = JSON.stringify(Array.from(kp.secretKey))
        const info: KeypairInfo = { pubkey: kp.publicKey.toBase58(), secretKeyJson }
        saveKeypair(secretKeyJson)
        setGenerated(info)
        setMode('generated')
      } else {
        setMode('paste')
      }
    }
    if (input === 'q' || key.escape) process.exit(0)
  }, { isActive: mode === 'select' })

  // ── Generated — Enter untuk lanjut ───────────────────────────
  useInput((_input, key) => {
    if (mode !== 'generated' || !generated) return
    if (key.return) onDone(generated)
  }, { isActive: mode === 'generated' })

  function handlePasteSubmit(val: string) {
    try {
      const arr = JSON.parse(val) as number[]
      if (!Array.isArray(arr) || arr.length !== 64) {
        setPasteError('Format salah — harus JSON array 64 bytes')
        return
      }
      const kp = Keypair.fromSecretKey(Uint8Array.from(arr))
      const info: KeypairInfo = { pubkey: kp.publicKey.toBase58(), secretKeyJson: val.trim() }
      saveKeypair(val.trim())
      onDone(info)
    } catch {
      setPasteError('JSON tidak valid — pastikan format [1,2,3,...]')
    }
  }

  return (
    <Box flexDirection="column" gap={1} paddingX={2} paddingY={1}>
      <Box flexDirection="column">
        <Text bold color="magenta">⚙  Kinko Setup — Keypair</Text>
        <Text dimColor>Agent butuh keypair Solana untuk signing transaksi</Text>
      </Box>

      {existing && mode === 'select' && (
        <Box flexDirection="column" gap={0} borderStyle="single" borderColor="yellow" paddingX={1}>
          <Text color="yellow">⚠  Keypair sebelumnya ditemukan di {KEYPAIR_FILE}</Text>
          <Text dimColor>  Pubkey: {existing.pubkey}</Text>
          <Text dimColor>  Generate baru akan menggantikan file ini.</Text>
        </Box>
      )}

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
            <Text bold>Disimpan ke:</Text>
            <Text color="yellow">  {KEYPAIR_FILE}</Text>
            <Text dimColor>  (file ini di-gitignore — jangan di-commit)</Text>
          </Box>
          <Text dimColor>SERVER_AGENT_PRIVATE_KEY akan otomatis diisi.</Text>
          <Text dimColor>Enter untuk lanjut</Text>
        </Box>
      )}

      {mode === 'paste' && (
        <Box flexDirection="column" gap={1}>
          <Box flexDirection="column" gap={0}>
            <Text bold>Paste secret key (JSON byte array):</Text>
            <Text dimColor>  Format: [1,2,3,...] — 64 bytes</Text>
            <Text dimColor>  Cara dapat: <Text color="yellow">cat keypair.json | tr -d '\n'</Text></Text>
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
