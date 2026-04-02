/**
 * Setup TUI — Service Config
 *
 * RULE (lihat CLAUDE.md): Setiap kali menambahkan env var baru atau runtime config baru
 * ke salah satu service, tambahkan juga field-nya di sini supaya setup TUI tetap up-to-date.
 *
 * Cara tambah field baru:
 * 1. Temukan ServiceDef yang relevan berdasarkan id-nya
 * 2. Tambahkan EnvField ke array fields-nya
 * 3. Isi default per env/baseUrls jika ada nilai standar
 *
 * 4 mode environment:
 *   dev-local    — localnet RPC (localhost:8899), semua URL localhost
 *   dev-devnet   — devnet RPC, semua URL localhost atau ngrok tunnel
 *   prod-devnet  — devnet RPC, URL real/staging
 *   prod-mainnet — mainnet RPC, URL real
 */

import { rpcUrlForEnv } from '../utils/rpc.js'

export type Env = 'dev-local' | 'dev-devnet' | 'prod-devnet' | 'prod-mainnet'

export type BaseUrls = {
  serverUrl: string
  frontendUrl: string
}

export type EnvField = {
  key: string
  label: string
  hint?: string
  default?: (env: Env, baseUrls: BaseUrls) => string
  required?: boolean
  secret?: boolean
}

export type ServiceDef = {
  id: string
  name: string
  description: string
  envFile: string
  fields: EnvField[]
}

export const SERVICES: ServiceDef[] = [
  // ─────────────────────────────────────────────────────────────
  // apps/server — Backend API + AI agent runtime
  // ─────────────────────────────────────────────────────────────
  {
    id: 'server',
    name: 'Server',
    description: 'Backend API + AI agent runtime (apps/server)',
    envFile: 'apps/server/.env',
    fields: [
      {
        key: 'SOLANA_RPC_URL',
        label: 'Solana RPC URL',
        default: (env) => rpcUrlForEnv(env),
      },
      {
        key: 'ANCHOR_PROGRAM_ID',
        label: 'Anchor Program ID',
        default: () => 'aAm7smaMYpPzx4PN7LdzRyPd1AqVLzRWbHjCc3qJkXL',
      },
      {
        key: 'AGENT_PRIVATE_KEY',
        label: 'Agent Private Key',
        hint: 'JSON byte array — otomatis dari keypair yang di-generate',
        required: true,
        secret: true,
      },
      {
        key: 'AGENT_A_ASSET_ADDRESS',
        label: 'Agent Asset Address (MPL Core)',
        hint: 'Diisi otomatis setelah registrasi Metaplex. Kosongkan jika belum ada.',
      },
      {
        key: 'OPENROUTER_API_KEY',
        label: 'OpenRouter API Key',
        hint: 'Dari https://openrouter.ai/keys — format: sk-or-...',
        required: true,
        secret: true,
      },
      {
        key: 'AI_MODEL',
        label: 'AI Model (default)',
        hint: 'Lihat semua model: https://openrouter.ai/models  |  Bisa di-override per-request',
        default: () => 'openai/gpt-4o-mini',
      },
      {
        key: 'PORT',
        label: 'Port',
        default: () => '3001',
      },
      {
        key: 'AGENT_A_URL',
        label: 'Server Base URL',
        hint: 'URL publik server ini — dipakai di agent metadata & agent card',
        default: (_env, b) => b.serverUrl,
      },
      {
        key: 'FRONTEND_URL',
        label: 'Frontend URL (untuk CORS)',
        hint: 'URL frontend yang boleh akses API ini',
        default: (_env, b) => b.frontendUrl,
      },
      {
        key: 'AGENT_B_URL',
        label: 'Agent B URL',
        hint: 'URL price oracle agent untuk A2A — jika di local pakai localhost:3002',
        default: (env) => env === 'dev-local' || env === 'dev-devnet' ? 'http://localhost:3002' : '',
      },
      {
        key: 'COST_PER_REQUEST_LAMPORTS',
        label: 'Cost per request (lamports)',
        hint: '10000000 = 0.0001 SOL',
        default: () => '10000000',
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────
  // apps/agent-b — Price oracle agent (x402)
  // ─────────────────────────────────────────────────────────────
  {
    id: 'agent-b',
    name: 'Agent B',
    description: 'Price oracle agent — x402 endpoint (apps/agent-b)',
    envFile: 'apps/agent-b/.env',
    fields: [
      {
        key: 'SOLANA_RPC_URL',
        label: 'Solana RPC URL',
        default: (env) => rpcUrlForEnv(env),
      },
      {
        key: 'AGENT_B_WALLET',
        label: 'Agent B Wallet (base58 pubkey)',
        hint: 'Penerima x402 payment — diisi otomatis dari AGENT_SIGNER_PDA setelah registrasi',
        required: true,
      },
      {
        key: 'PORT',
        label: 'Port',
        default: () => '3002',
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────
  // apps/web — Next.js frontend
  // ─────────────────────────────────────────────────────────────
  {
    id: 'web',
    name: 'Web Frontend',
    description: 'Next.js frontend (apps/web)',
    envFile: 'apps/web/.env.local',
    fields: [
      {
        key: 'NEXT_PUBLIC_AGENT_URL',
        label: 'Server (API) URL',
        hint: 'URL apps/server yang diakses dari browser — gunakan ngrok URL jika tunneling',
        default: (_env, b) => b.serverUrl,
      },
      {
        key: 'NEXT_PUBLIC_SOLANA_RPC_URL',
        label: 'Solana RPC URL',
        default: (env) => rpcUrlForEnv(env),
      },
      {
        key: 'NEXT_PUBLIC_ANCHOR_PROGRAM_ID',
        label: 'Anchor Program ID',
        default: () => 'aAm7smaMYpPzx4PN7LdzRyPd1AqVLzRWbHjCc3qJkXL',
      },
      {
        key: 'NEXT_PUBLIC_AGENT_ASSET_ADDRESS',
        label: 'Agent Asset Address',
        hint: 'Diisi otomatis setelah registrasi Metaplex.',
      },
    ],
  },

]
