import React, { useEffect } from 'react'
import { Box, Text } from 'ink'

export function Done({
  written,
  skipped,
  onExit,
}: {
  written: string[]
  skipped: string[]
  onExit: () => void
}) {
  useEffect(() => {
    const t = setTimeout(onExit, 200)
    return () => clearTimeout(t)
  }, [onExit])

  return (
    <Box flexDirection="column" gap={1} paddingX={2} paddingY={1}>
      <Text bold color="green">✓ Setup selesai!</Text>

      {written.length > 0 && (
        <Box flexDirection="column" gap={0}>
          <Text bold>File yang ditulis:</Text>
          {written.map(f => (
            <Text key={f} color="cyan">  ✓ {f}</Text>
          ))}
        </Box>
      )}

      {skipped.length > 0 && (
        <Box flexDirection="column" gap={0}>
          <Text bold dimColor>Dilewati (tidak dipilih):</Text>
          {skipped.map(f => (
            <Text key={f} dimColor>  – {f}</Text>
          ))}
        </Box>
      )}

      <Box flexDirection="column" gap={0}>
        <Text dimColor>Jalankan semua services:</Text>
        <Text color="yellow">  bun run dev:server  # Terminal 1</Text>
        <Text color="yellow">  bun run dev:agent-b # Terminal 2</Text>
        <Text color="yellow">  bun run dev:web     # Terminal 3</Text>
      </Box>
    </Box>
  )
}
