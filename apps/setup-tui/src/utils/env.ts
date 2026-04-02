import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs'
import { resolve, dirname } from 'path'

// Project root = tempat bun run setup dijalankan (dari root monorepo)
const ROOT = process.cwd()

export function resolveFromRoot(relPath: string): string {
  return resolve(ROOT, relPath)
}

export function readEnvFile(relPath: string): Record<string, string> {
  const absPath = resolveFromRoot(relPath)
  if (!existsSync(absPath)) return {}
  const content = readFileSync(absPath, 'utf-8')
  const result: Record<string, string> = {}
  for (const line of content.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eqIdx = trimmed.indexOf('=')
    if (eqIdx < 0) continue
    const key = trimmed.slice(0, eqIdx).trim()
    const val = trimmed.slice(eqIdx + 1).trim()
    result[key] = val
  }
  return result
}

export function writeEnvFile(relPath: string, values: Record<string, string>): void {
  const absPath = resolveFromRoot(relPath)
  mkdirSync(dirname(absPath), { recursive: true })
  const lines = Object.entries(values).map(([k, v]) => `${k}=${v}`)
  writeFileSync(absPath, lines.join('\n') + '\n', 'utf-8')
}
