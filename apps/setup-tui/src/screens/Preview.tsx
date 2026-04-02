import React, { useState } from 'react'
import { Box, Text, useInput } from 'ink'
import { SERVICES } from '../config/services.js'

type FormValues = Record<string, Record<string, string>>

// Field keys yang auto-filled — tidak ditampilkan di preview (terlalu panjang + secret)
const HIDDEN_FIELDS = ['AGENT_PRIVATE_KEY', 'OPERATOR_PRIVATE_KEY']

export function Preview({
  services,
  values,
  onConfirm,
  onBack,
}: {
  services: string[]
  values: FormValues
  onConfirm: () => void
  onBack: () => void
}) {
  const [cursor, setCursor] = useState(0)
  const visibleServices = SERVICES.filter(s => services.includes(s.id))

  useInput((input, key) => {
    if (key.upArrow)   setCursor(c => Math.max(0, c - 1))
    if (key.downArrow) setCursor(c => Math.min(visibleServices.length - 1, c + 1))
    if (key.return)    onConfirm()
    if (input === 'b' || key.escape) onBack()
  })

  return (
    <Box flexDirection="column" gap={1} paddingX={2} paddingY={1}>
      {/* Header */}
      <Box flexDirection="column">
        <Text bold color="magenta">⚙  Kinko Setup — Preview</Text>
        <Text dimColor>Review semua config sebelum disimpan ke file .env</Text>
      </Box>

      {/* Config per service */}
      {visibleServices.map((svc, i) => {
        const svcValues = values[svc.id] ?? {}
        const fields = svc.fields.filter(f => !HIDDEN_FIELDS.includes(f.key))
        const isActive = cursor === i

        return (
          <Box key={svc.id} flexDirection="column" gap={0}>
            {/* Service header */}
            <Box gap={1}>
              <Text color={isActive ? 'cyan' : 'yellow'} bold>
                {isActive ? '▶' : ' '} {svc.name}
              </Text>
              <Text dimColor>({svc.envFile})</Text>
            </Box>

            {/* Fields */}
            {fields.map(field => {
              const val = svcValues[field.key] ?? ''
              const isEmpty = !val
              return (
                <Box key={field.key} gap={1} paddingLeft={3}>
                  <Text dimColor>{field.key}</Text>
                  <Text dimColor>=</Text>
                  {field.secret ? (
                    <Text color="yellow">{'*'.repeat(Math.min(val.length, 12)) || '(kosong)'}</Text>
                  ) : isEmpty ? (
                    <Text color={field.required ? 'red' : 'gray'}>(kosong{field.required ? ' — wajib!' : ''})</Text>
                  ) : (
                    <Text color="white">
                      {val.length > 60 ? val.slice(0, 57) + '…' : val}
                    </Text>
                  )}
                </Box>
              )
            })}

            {/* Keypair fields — summary saja */}
            {svc.fields.some(f => HIDDEN_FIELDS.includes(f.key)) && (
              <Box paddingLeft={3} gap={1}>
                <Text dimColor>AGENT/OPERATOR_PRIVATE_KEY</Text>
                <Text dimColor>=</Text>
                <Text color="green">✓ auto-filled dari keypair</Text>
              </Box>
            )}
          </Box>
        )
      })}

      {/* Required fields warning */}
      {visibleServices.some(svc =>
        svc.fields.some(f =>
          f.required &&
          !HIDDEN_FIELDS.includes(f.key) &&
          !values[svc.id]?.[f.key]
        )
      ) && (
        <Box borderStyle="single" borderColor="red" paddingX={1}>
          <Text color="red">⚠  Ada field wajib yang kosong — kembali dan isi dulu (b)</Text>
        </Box>
      )}

      {/* Actions */}
      <Box flexDirection="column" gap={0} marginTop={1}>
        <Text bold color="green">  Enter  Simpan semua .env dan lanjut</Text>
        <Text dimColor>  ↑↓  Scroll service  |  b / Esc  Kembali edit</Text>
      </Box>
    </Box>
  )
}
