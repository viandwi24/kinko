/**
 * Setup TUI — Service Config
 *
 * RULE (lihat CLAUDE.md): Setiap kali menambahkan env var baru atau runtime config baru
 * ke salah satu service, tambahkan juga field-nya di sini supaya setup TUI tetap up-to-date.
 *
 * Cara tambah field baru:
 * 1. Temukan ServiceDef yang relevan berdasarkan id-nya
 * 2. Tambahkan EnvField ke array fields-nya
 * 3. Isi default per env jika ada nilai standar
 *
 * 4 mode environment:
 *   dev-local    — localnet RPC (localhost:8899), semua URL localhost
 *   dev-devnet   — devnet RPC, semua URL localhost (services tetap lokal)
 *   prod-devnet  — devnet RPC, URL real/staging (isi manual)
 *   prod-mainnet — mainnet RPC, URL real (isi manual)
 */

export type Env = 'dev-local' | 'dev-devnet' | 'prod-devnet' | 'prod-mainnet'

export type EnvField = {
  key: string
  label: string
  hint?: string
  default?: (env: Env) => string
  required?: boolean
  secret?: boolean // mask input dengan *
}

export type ServiceDef = {
  id: string
  name: string
  description: string
  envFile: string // relatif dari project root
  fields: EnvField[]
}

// Helper — RPC URL per env
function rpcUrl(env: Env): string {
  if (env === 'dev-local')    return 'http://localhost:8899'
  if (env === 'dev-devnet')   return 'https://api.devnet.solana.com'
  if (env === 'prod-devnet')  return 'https://api.devnet.solana.com'
  return 'https://api.mainnet-beta.solana.com'
}

// Helper — URL lokal jika dev, kosong jika prod (isi manual)
function localOrEmpty(env: Env, localUrl: string): string {
  return env === 'dev-local' || env === 'dev-devnet' ? localUrl : ''
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
        default: (env) => rpcUrl(env),
      },
      {
        key: 'ANCHOR_PROGRAM_ID',
        label: 'Anchor Program ID',
        default: () => 'aAm7smaMYpPzx4PN7LdzRyPd1AqVLzRWbHjCc3qJkXL',
      },
      {
        key: 'AGENT_PRIVATE_KEY',
        label: 'Agent Private Key',
        hint: 'JSON byte array — run: cat keypair.json | tr -d "\\n"',
        required: true,
        secret: true,
      },
      {
        key: 'AGENT_A_ASSET_ADDRESS',
        label: 'Agent Asset Address (MPL Core)',
        hint: 'Dari output setup-agent.ts. Kosongkan jika belum ada.',
      },
      {
        key: 'OPENAI_API_KEY',
        label: 'OpenAI API Key',
        hint: 'sk-...',
        required: true,
        secret: true,
      },
      {
        key: 'PORT',
        label: 'Port',
        default: () => '3001',
      },
      {
        key: 'FRONTEND_URL',
        label: 'Frontend URL (untuk CORS)',
        hint: 'URL frontend yang diizinkan mengakses API ini',
        default: (env) => localOrEmpty(env, 'http://localhost:3000'),
      },
      {
        key: 'AGENT_B_URL',
        label: 'Agent B URL',
        hint: 'URL price oracle agent untuk A2A',
        default: (env) => localOrEmpty(env, 'http://localhost:3002'),
      },
      {
        key: 'COST_PER_REQUEST_LAMPORTS',
        label: 'Cost per request (lamports)',
        hint: '1000000 = 0.001 SOL',
        default: () => '1000000',
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
        default: (env) => rpcUrl(env),
      },
      {
        key: 'AGENT_B_WALLET',
        label: 'Agent B Wallet (base58 pubkey)',
        hint: 'Penerima x402 payment. Gunakan AGENT_SIGNER_PDA dari output setup-agent.',
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
        hint: 'URL apps/server yang diakses dari browser',
        default: (env) => localOrEmpty(env, 'http://localhost:3001'),
      },
      {
        key: 'NEXT_PUBLIC_SOLANA_RPC_URL',
        label: 'Solana RPC URL',
        default: (env) => rpcUrl(env),
      },
      {
        key: 'NEXT_PUBLIC_ANCHOR_PROGRAM_ID',
        label: 'Anchor Program ID',
        default: () => 'aAm7smaMYpPzx4PN7LdzRyPd1AqVLzRWbHjCc3qJkXL',
      },
      {
        key: 'NEXT_PUBLIC_AGENT_ASSET_ADDRESS',
        label: 'Agent Asset Address',
        hint: 'Dari output setup-agent.ts.',
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────
  // packages/solana — Onchain setup scripts
  // ─────────────────────────────────────────────────────────────
  {
    id: 'solana',
    name: 'Solana Scripts',
    description: 'Onchain setup scripts (packages/solana)',
    envFile: 'packages/solana/.env',
    fields: [
      {
        key: 'SOLANA_RPC_URL',
        label: 'Solana RPC URL',
        default: (env) => rpcUrl(env),
      },
      {
        key: 'OPERATOR_PRIVATE_KEY',
        label: 'Operator Private Key',
        hint: 'JSON byte array — run: cat keypair.json | tr -d "\\n"',
        required: true,
        secret: true,
      },
      {
        key: 'AGENT_SERVICE_URL',
        label: 'Agent Service URL',
        hint: 'Digunakan dalam ERC-8004 registration document',
        default: (env) => localOrEmpty(env, 'http://localhost:3001'),
      },
    ],
  },
]
