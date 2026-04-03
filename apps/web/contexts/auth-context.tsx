'use client'

/**
 * AuthContext — SIWS (Sign-In With Solana) session management
 *
 * - Signs once when wallet connects → stores JWT in localStorage
 * - Auto-clears session when wallet disconnects or changes
 * - Auto-refreshes session when JWT is close to expiry (< 1h remaining)
 * - Exposes: token, isAuthenticated, login(), logout(), isLoggingIn
 */

import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import { usePathname } from 'next/navigation'
import { fetchNonce, loginWithSignature } from '@/lib/api'

const STORAGE_KEY = 'kinko_auth'
const REFRESH_THRESHOLD_MS = 60 * 60 * 1000 // re-login if < 1h left

type StoredSession = {
  token: string
  wallet: string
  expiresAt: number // ms
}

type AuthState = {
  token: string | null
  wallet: string | null
  isAuthenticated: boolean
  isLoggingIn: boolean
  login: () => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthState>({
  token: null,
  wallet: null,
  isAuthenticated: false,
  isLoggingIn: false,
  login: async () => {},
  logout: () => {},
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { publicKey, signMessage, connected, disconnect } = useWallet()
  const pathname = usePathname()
  const isAppRoute = pathname?.startsWith('/app')
  const [session, setSession] = useState<StoredSession | null>(null)
  const [isLoggingIn, setIsLoggingIn] = useState(false)
  const loginAttemptedRef = useRef<string | null>(null) // prevents double-trigger

  // ── Load session from localStorage on mount ──────────────────────────────
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (!raw) return
      const stored: StoredSession = JSON.parse(raw)
      // Validate not expired
      if (stored.expiresAt > Date.now()) {
        setSession(stored)
      } else {
        localStorage.removeItem(STORAGE_KEY)
      }
    } catch {
      localStorage.removeItem(STORAGE_KEY)
    }
  }, [])

  const saveSession = useCallback((s: StoredSession) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s))
    setSession(s)
  }, [])

  const clearSession = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY)
    setSession(null)
    loginAttemptedRef.current = null
  }, [])

  // ── logout ────────────────────────────────────────────────────────────────
  const logout = useCallback(() => {
    clearSession()
    // Also disconnect wallet so they have to reconnect cleanly
    disconnect().catch(() => {})
  }, [clearSession, disconnect])

  // ── login (sign once) ─────────────────────────────────────────────────────
  const login = useCallback(async () => {
    if (!publicKey || !signMessage) throw new Error('Wallet not connected')
    if (isLoggingIn) return

    setIsLoggingIn(true)
    try {
      const walletStr = publicKey.toBase58()
      const { nonce } = await fetchNonce(walletStr)

      // Build the exact same message as server's buildSignMessage()
      const message = `Sign in to Kinko\n\nWallet: ${walletStr}\nNonce: ${nonce}\n\nThis request will not trigger any blockchain transaction or cost any gas.`
      const msgBytes = new TextEncoder().encode(message)
      const sigBytes = await signMessage(msgBytes)
      const signature = Buffer.from(sigBytes).toString('base64')

      const result = await loginWithSignature(walletStr, signature, nonce)
      saveSession({ token: result.token, wallet: result.wallet, expiresAt: result.expiresAt })
    } finally {
      setIsLoggingIn(false)
    }
  }, [publicKey, signMessage, isLoggingIn, saveSession])

  // ── Auto-login when wallet connects (only inside /app/* routes) ──────────
  useEffect(() => {
    if (!isAppRoute) return
    if (!connected || !publicKey || !signMessage) return
    const walletStr = publicKey.toBase58()

    // Already have a valid session for this wallet?
    if (session?.wallet === walletStr && session.expiresAt > Date.now() + REFRESH_THRESHOLD_MS) {
      return
    }

    // Prevent double trigger for same wallet
    if (loginAttemptedRef.current === walletStr) return
    loginAttemptedRef.current = walletStr

    login().catch((err) => {
      console.error('[auth] auto-login failed:', err)
      loginAttemptedRef.current = null
    })
  }, [connected, publicKey, signMessage, isAppRoute]) // intentionally exclude login/session to avoid loops

  // ── Clear session when wallet disconnects or changes ─────────────────────
  useEffect(() => {
    if (!connected) {
      clearSession()
      return
    }
    if (publicKey && session && session.wallet !== publicKey.toBase58()) {
      clearSession()
    }
  }, [connected, publicKey]) // intentionally exclude session/clearSession

  // ── Auto-refresh when token is near expiry ────────────────────────────────
  useEffect(() => {
    if (!session) return
    const msLeft = session.expiresAt - Date.now()
    if (msLeft <= 0) { clearSession(); return }

    // Schedule refresh when < REFRESH_THRESHOLD_MS remaining
    const refreshIn = Math.max(0, msLeft - REFRESH_THRESHOLD_MS)
    const timer = setTimeout(() => {
      if (connected && publicKey?.toBase58() === session.wallet) {
        loginAttemptedRef.current = null // allow re-login
        login().catch(() => {})
      }
    }, refreshIn)
    return () => clearTimeout(timer)
  }, [session?.expiresAt]) // intentionally minimal deps

  const value: AuthState = {
    token: session?.token ?? null,
    wallet: session?.wallet ?? null,
    isAuthenticated: !!session && session.expiresAt > Date.now(),
    isLoggingIn,
    login,
    logout,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  return useContext(AuthContext)
}
