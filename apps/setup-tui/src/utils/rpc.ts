import type { Env } from '../config/services.js'

export function rpcUrlForEnv(env: Env): string {
  if (env === 'dev-local')    return 'http://localhost:8899'
  if (env === 'dev-devnet')   return 'https://api.devnet.solana.com'
  if (env === 'prod-devnet')  return 'https://api.devnet.solana.com'
  return 'https://api.mainnet-beta.solana.com'
}
