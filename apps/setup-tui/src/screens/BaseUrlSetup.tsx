import React, { useState } from 'react'
import { Box, Text } from 'ink'
import TextInput from 'ink-text-input'
import type { Env } from '../config/services.js'
import { readEnvFile } from '../utils/env.js'

export type BaseUrls = {
  serverUrl: string
  frontendUrl: string
}

type Field = 'server' | 'frontend'

function defaultServerUrl(env: Env) {
  return env === 'dev-local' || env === 'dev-devnet' ? 'http://localhost:3001' : ''
}
function defaultFrontendUrl(env: Env) {
  return env === 'dev-local' || env === 'dev-devnet' ? 'http://localhost:3000' : ''
}

function loadExistingUrls(env: Env) {
  const serverEnv = readEnvFile('apps/server/.env')
  return {
    serverUrl: serverEnv['AGENT_A_URL'] || defaultServerUrl(env),
    frontendUrl: serverEnv['FRONTEND_URL'] || defaultFrontendUrl(env),
  }
}

export function BaseUrlSetup({ env, onDone }: { env: Env; onDone: (urls: BaseUrls) => void }) {
  const [field, setField] = useState<Field>('server')
  const existing = loadExistingUrls(env)
  const [serverUrl, setServerUrl] = useState(existing.serverUrl)
  const [frontendUrl, setFrontendUrl] = useState(existing.frontendUrl)

  function handleServerSubmit(val: string) {
    setServerUrl(val)
    setField('frontend')
  }

  function handleFrontendSubmit(val: string) {
    onDone({ serverUrl: serverUrl || defaultServerUrl(env), frontendUrl: val || defaultFrontendUrl(env) })
  }

  return (
    <Box flexDirection="column" gap={1} paddingX={2} paddingY={1}>
      <Box flexDirection="column">
        <Text bold color="magenta">⚙  Kinko Setup — Base URLs</Text>
        <Text dimColor>URL dasar untuk setiap service (dipakai di CORS, metadata agent, dan env)</Text>
      </Box>

      {/* Server URL */}
      <Box flexDirection="column" gap={0}>
        <Box gap={1}>
          <Text bold color={field === 'server' ? 'cyan' : 'green'}>
            {field === 'server' ? '›' : '✓'}
          </Text>
          <Text bold>Server URL</Text>
          {field !== 'server' && <Text color="cyan">{serverUrl}</Text>}
        </Box>
        {field === 'server' && (
          <>
            <Text dimColor>  URL di mana apps/server bisa diakses dari luar</Text>
            <Text dimColor>  Contoh prod: https://api.kinko.app</Text>
            <Box gap={1} marginTop={1}>
              <Text bold color="cyan">›</Text>
              <TextInput
                value={serverUrl}
                onChange={setServerUrl}
                onSubmit={handleServerSubmit}
                placeholder={defaultServerUrl(env) || 'https://api.yourdomain.com'}
              />
            </Box>
          </>
        )}
      </Box>

      {/* Frontend URL */}
      {field === 'frontend' && (
        <Box flexDirection="column" gap={0}>
          <Box gap={1}>
            <Text bold color="cyan">›</Text>
            <Text bold>Frontend URL</Text>
          </Box>
          <Text dimColor>  URL di mana apps/web bisa diakses dari luar</Text>
          <Text dimColor>  Contoh prod: https://kinko.app</Text>
          <Box gap={1} marginTop={1}>
            <Text bold color="cyan">›</Text>
            <TextInput
              value={frontendUrl}
              onChange={setFrontendUrl}
              onSubmit={handleFrontendSubmit}
              placeholder={defaultFrontendUrl(env) || 'https://yourdomain.com'}
            />
          </Box>
        </Box>
      )}

      <Text dimColor>Enter untuk lanjut</Text>
    </Box>
  )
}
