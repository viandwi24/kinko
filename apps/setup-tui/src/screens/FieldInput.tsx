import React, { useState, useEffect } from 'react'
import { Box, Text } from 'ink'
import TextInput from 'ink-text-input'
import type { ServiceDef, EnvField, Env } from '../config/services.js'

export function FieldInput({
  env,
  service,
  field,
  currentValue,
  serviceNum,
  totalServices,
  fieldNum,
  totalFields,
  onSubmit,
}: {
  env: Env
  service: ServiceDef
  field: EnvField
  currentValue: string
  serviceNum: number
  totalServices: number
  fieldNum: number
  totalFields: number
  onSubmit: (value: string) => void
}) {
  // Reset value setiap kali field berganti (key prop di parent memastikan remount,
  // tapi useEffect ini jadi safety net)
  const [value, setValue] = useState(currentValue)
  useEffect(() => { setValue(currentValue) }, [currentValue])

  const progress    = `${fieldNum}/${totalFields}`
  const svcProgress = `${serviceNum}/${totalServices}`

  function handleSubmit(val: string) {
    onSubmit(val)
    // Reset segera setelah submit supaya field berikutnya mulai bersih
    setValue('')
  }

  return (
    <Box flexDirection="column" gap={1} paddingX={2} paddingY={1}>
      {/* Header */}
      <Box flexDirection="column">
        <Text bold color="magenta">⚙  Kinko Setup</Text>
        <Box gap={2}>
          <Text>Env: <Text color="cyan">{env}</Text></Text>
          <Text>
            Service: <Text color="yellow">{service.name}</Text>{' '}
            <Text dimColor>({svcProgress})</Text>
          </Text>
          <Text dimColor>Field {progress}</Text>
        </Box>
      </Box>

      {/* Field info */}
      <Box flexDirection="column" gap={0}>
        <Box gap={1}>
          <Text bold>{field.label}</Text>
          {field.required && <Text color="red">*</Text>}
        </Box>
        {field.hint && <Text dimColor>  {field.hint}</Text>}
        <Text dimColor color="gray">  → {service.envFile}</Text>
      </Box>

      {/* Input */}
      <Box gap={1}>
        <Text bold color="cyan">›</Text>
        <TextInput
          value={value}
          onChange={setValue}
          onSubmit={handleSubmit}
          mask={field.secret ? '*' : undefined}
          placeholder={
            currentValue
              ? field.secret ? '(sudah diisi — Enter untuk pakai, atau ketik baru)' : `(default: ${currentValue})`
              : field.required
                ? '(wajib diisi)'
                : '(opsional — Enter untuk skip)'
          }
        />
      </Box>

      <Text dimColor>Enter untuk lanjut{currentValue && !field.secret ? ` · default: ${currentValue}` : ''}</Text>
    </Box>
  )
}
