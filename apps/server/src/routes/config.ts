import { Hono } from 'hono'
import { config } from '../config.js'

export const configRoute = new Hono()

configRoute.get('/', (c) => {
  return c.json({
    programId: config.programId,
    rpcUrl: config.rpcUrl,
    agentAssetAddress: config.agentAssetAddress,
  })
})
