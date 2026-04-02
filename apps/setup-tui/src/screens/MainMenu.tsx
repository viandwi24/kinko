import React, { useState } from 'react'
import { Box, Text, useInput } from 'ink'

export type MainMenuChoice = 'setup' | 'register'

const ITEMS: { label: string; value: MainMenuChoice; desc: string }[] = [
  { label: 'Setup Environment', value: 'setup',    desc: 'Generate .env files untuk semua services' },
  { label: 'Register Agent',    value: 'register', desc: 'Daftarkan agent ke Metaplex Agent Registry (registerIdentityV1)' },
]

export function MainMenu({ onSelect }: { onSelect: (choice: MainMenuChoice) => void }) {
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
        <Text dimColor>Solana AI agent setup tool</Text>
      </Box>

      <Box flexDirection="column" gap={0}>
        <Text bold>Pilih aksi:</Text>
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