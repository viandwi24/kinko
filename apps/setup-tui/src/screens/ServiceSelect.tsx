import React, { useState } from 'react'
import { Box, Text, useInput } from 'ink'
import { SERVICES, type Env } from '../config/services.js'

export function ServiceSelect({
  env,
  onConfirm,
}: {
  env: Env
  onConfirm: (ids: string[]) => void
}) {
  const [cursor, setCursor]   = useState(0)
  const [selected, setSelected] = useState<Set<string>>(
    new Set(SERVICES.map(s => s.id)),
  )

  useInput((input, key) => {
    if (key.upArrow)   setCursor(c => Math.max(0, c - 1))
    if (key.downArrow) setCursor(c => Math.min(SERVICES.length - 1, c + 1))
    if (input === ' ') {
      const id = SERVICES[cursor].id
      setSelected(prev => {
        const next = new Set(prev)
        next.has(id) ? next.delete(id) : next.add(id)
        return next
      })
    }
    if (key.return) onConfirm([...selected])
    if (input === 'a') setSelected(new Set(SERVICES.map(s => s.id)))
    if (input === 'n') setSelected(new Set())
    if (input === 'q' || key.escape) process.exit(0)
  })

  return (
    <Box flexDirection="column" gap={1} paddingX={2} paddingY={1}>
      <Box flexDirection="column">
        <Text bold color="magenta">⚙  Kinko Setup</Text>
        <Text>
          Environment: <Text color="cyan">{env}</Text>
        </Text>
      </Box>

      <Box flexDirection="column" gap={0}>
        <Text bold>Pilih services yang mau dikonfigurasi:</Text>
        {SERVICES.map((svc, i) => (
          <Box key={svc.id} gap={2}>
            <Text color={i === cursor ? 'cyan' : undefined}>
              {i === cursor ? '▶' : ' '}{' '}
              {selected.has(svc.id) ? '◉' : '○'} {svc.name}
            </Text>
            <Text dimColor>{svc.description}</Text>
          </Box>
        ))}
      </Box>

      <Text dimColor>
        ↑↓ navigasi  Space toggle  a semua  n hapus semua  Enter konfirmasi  q keluar
      </Text>
    </Box>
  )
}
