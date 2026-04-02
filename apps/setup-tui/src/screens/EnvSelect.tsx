import React, { useState } from 'react'
import { Box, Text, useInput } from 'ink'
import type { Env } from '../config/services.js'

const ITEMS: { label: string; value: Env; desc: string }[] = [
  { label: 'Development — Localnet', value: 'dev-local',    desc: 'local validator · localhost URLs' },
  { label: 'Development — Devnet',   value: 'dev-devnet',   desc: 'devnet RPC · localhost URLs' },
  { label: 'Production — Devnet',    value: 'prod-devnet',  desc: 'devnet RPC · real/staging URLs' },
  { label: 'Production — Mainnet',   value: 'prod-mainnet', desc: 'mainnet RPC · real URLs' },
]

export function EnvSelect({ onSelect }: { onSelect: (env: Env) => void }) {
  const [cursor, setCursor] = useState(0)

  useInput((input, key) => {
    if (key.upArrow)   setCursor(c => Math.max(0, c - 1))
    if (key.downArrow) setCursor(c => Math.min(ITEMS.length - 1, c + 1))
    if (key.return)    onSelect(ITEMS[cursor].value)
    if (input === 'q' || key.escape) process.exit(0)
  })

  return (
    <Box flexDirection="column" gap={1} paddingX={2} paddingY={1}>
      <Box flexDirection="column">
        <Text bold color="magenta">⚙  Kinko Setup</Text>
        <Text dimColor>Generate .env files untuk semua services</Text>
      </Box>

      <Box flexDirection="column" gap={0}>
        <Text bold>Pilih environment:</Text>
        {ITEMS.map((item, i) => (
          <Box key={item.value} gap={2}>
            <Text color={i === cursor ? 'cyan' : undefined}>
              {i === cursor ? '▶' : ' '} {item.label}
            </Text>
            <Text dimColor>{item.desc}</Text>
          </Box>
        ))}
      </Box>

      <Text dimColor>↑↓ navigasi  Enter pilih  q keluar</Text>
    </Box>
  )
}
