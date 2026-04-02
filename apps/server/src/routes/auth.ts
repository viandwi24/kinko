/**
 * auth.ts — SIWS (Sign-In With Solana) auth flow
 *
 * GET  /api/auth/nonce?wallet=<pubkey>   → { nonce, expiresAt }
 * POST /api/auth/login                   → { token }  (JWT, 24h)
 * POST /api/auth/logout                  → { ok: true }  (client-side invalidation hint)
 *
 * JWT payload: { wallet: string, iat: number, exp: number }
 *
 * Machine callers (A2A / CLI) skip auth and use X-Payment header instead.
 */

import { Hono } from 'hono'
import { PublicKey } from '@solana/web3.js'
import nacl from 'tweetnacl'

export const authRoute = new Hono()

// ─── Config ──────────────────────────────────────────────────────────────────

const JWT_SECRET = process.env.JWT_SECRET ?? 'kinko-dev-secret-change-in-production'
const JWT_EXPIRY_SECONDS = 24 * 60 * 60 // 24 hours
const NONCE_TTL_MS = 5 * 60 * 1000       // 5 minutes

// ─── In-memory nonce store ────────────────────────────────────────────────────

type NonceEntry = { nonce: string; expiresAt: number }
const nonceStore = new Map<string, NonceEntry>() // wallet → entry

function cleanExpiredNonces() {
  const now = Date.now()
  for (const [key, entry] of nonceStore) {
    if (entry.expiresAt < now) nonceStore.delete(key)
  }
}

function generateNonce(): string {
  const bytes = nacl.randomBytes(16)
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('')
}

// ─── JWT helpers (manual, no external lib needed) ────────────────────────────

function base64url(input: Uint8Array | string): string {
  const str = typeof input === 'string' ? input : String.fromCharCode(...input)
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}

function base64urlDecode(input: string): string {
  const padded = input.replace(/-/g, '+').replace(/_/g, '/').padEnd(
    input.length + (4 - (input.length % 4)) % 4, '='
  )
  return atob(padded)
}

async function signJwt(payload: Record<string, unknown>): Promise<string> {
  const header = base64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
  const body = base64url(JSON.stringify(payload))
  const data = `${header}.${body}`
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(JWT_SECRET),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(data))
  return `${data}.${base64url(new Uint8Array(sig))}`
}

async function verifyJwt(token: string): Promise<{ wallet: string; exp: number } | null> {
  try {
    const [header, body, sig] = token.split('.')
    if (!header || !body || !sig) return null

    const data = `${header}.${body}`
    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(JWT_SECRET),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    )

    // Decode base64url signature
    const sigDecoded = base64urlDecode(sig)
    const sigBytes = new Uint8Array(sigDecoded.length)
    for (let i = 0; i < sigDecoded.length; i++) sigBytes[i] = sigDecoded.charCodeAt(i)

    const valid = await crypto.subtle.verify('HMAC', key, sigBytes, new TextEncoder().encode(data))
    if (!valid) return null

    const payload = JSON.parse(base64urlDecode(body))
    if (payload.exp < Math.floor(Date.now() / 1000)) return null

    return { wallet: payload.wallet, exp: payload.exp }
  } catch {
    return null
  }
}

// ─── Routes ───────────────────────────────────────────────────────────────────

/** GET /api/auth/nonce?wallet=<pubkey> */
authRoute.get('/nonce', (c) => {
  cleanExpiredNonces()

  const wallet = c.req.query('wallet')
  if (!wallet) return c.json({ error: 'wallet query param required' }, 400)

  // Validate it's a valid Solana pubkey
  try { new PublicKey(wallet) } catch {
    return c.json({ error: 'invalid wallet address' }, 400)
  }

  const nonce = generateNonce()
  const expiresAt = Date.now() + NONCE_TTL_MS
  nonceStore.set(wallet, { nonce, expiresAt })

  return c.json({ nonce, expiresAt })
})

/** POST /api/auth/login  { wallet, signature, nonce } */
authRoute.post('/login', async (c) => {
  const body = await c.req.json<{ wallet: string; signature: string; nonce: string }>()

  if (!body.wallet || !body.signature || !body.nonce) {
    return c.json({ error: 'wallet, signature, and nonce are required' }, 400)
  }

  // 1. Validate wallet format
  let pubkey: PublicKey
  try { pubkey = new PublicKey(body.wallet) } catch {
    return c.json({ error: 'invalid wallet address' }, 400)
  }

  // 2. Check nonce exists and not expired
  const entry = nonceStore.get(body.wallet)
  if (!entry) return c.json({ error: 'nonce not found — request a new one' }, 401)
  if (entry.expiresAt < Date.now()) {
    nonceStore.delete(body.wallet)
    return c.json({ error: 'nonce expired — request a new one' }, 401)
  }
  if (entry.nonce !== body.nonce) {
    return c.json({ error: 'nonce mismatch' }, 401)
  }

  // 3. Verify Solana wallet signature
  const message = buildSignMessage(body.wallet, body.nonce)
  const msgBytes = new TextEncoder().encode(message)

  let sigBytes: Uint8Array
  try {
    sigBytes = new Uint8Array(Buffer.from(body.signature, 'base64'))
  } catch {
    return c.json({ error: 'invalid signature encoding — expected base64' }, 400)
  }

  const valid = nacl.sign.detached.verify(msgBytes, sigBytes, pubkey.toBytes())
  if (!valid) return c.json({ error: 'signature verification failed' }, 401)

  // 4. Consume nonce (one-time use)
  nonceStore.delete(body.wallet)

  // 5. Issue JWT
  const now = Math.floor(Date.now() / 1000)
  const token = await signJwt({
    wallet: body.wallet,
    iat: now,
    exp: now + JWT_EXPIRY_SECONDS,
  })

  return c.json({
    token,
    wallet: body.wallet,
    expiresAt: (now + JWT_EXPIRY_SECONDS) * 1000,
  })
})

/** POST /api/auth/logout — client hint only, JWT is stateless */
authRoute.post('/logout', (c) => {
  return c.json({ ok: true })
})

// ─── Middleware export ────────────────────────────────────────────────────────

/**
 * Returns the verified wallet from the Authorization header, or null.
 * Use in protected routes:
 *   const wallet = await getAuthWallet(c)
 *   if (!wallet) return c.json({ error: 'unauthorized' }, 401)
 */
export async function getAuthWallet(c: { req: { header: (k: string) => string | undefined } }): Promise<string | null> {
  const authHeader = c.req.header('Authorization')
  if (!authHeader?.startsWith('Bearer ')) return null
  const token = authHeader.slice(7)
  const payload = await verifyJwt(token)
  return payload?.wallet ?? null
}

/**
 * The exact message the user signs. Must match frontend exactly.
 * Format is human-readable for wallet popup UX.
 */
export function buildSignMessage(wallet: string, nonce: string): string {
  return `Sign in to Kinko\n\nWallet: ${wallet}\nNonce: ${nonce}\n\nThis request will not trigger any blockchain transaction or cost any gas.`
}
