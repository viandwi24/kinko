import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { chatRoute } from './routes/chat'
import { agentCardRoute } from './routes/agent-card'
import { configRoute } from './routes/config'

const app = new Hono()

app.use('*', logger())
app.use('*', cors({
  origin: ['http://localhost:3000', process.env.FRONTEND_URL ?? ''],
  allowMethods: ['GET', 'POST'],
  allowHeaders: ['Content-Type', 'Authorization'],
}))

app.get('/health', (c) => c.json({ status: 'ok', agent: 'kinko' }))

app.route('/.well-known', agentCardRoute)
app.route('/api/config', configRoute)
app.route('/api', chatRoute)

const port = Number(process.env.PORT ?? 3001)
console.log(`Kinko Agent running on http://localhost:${port}`)

export default {
  port,
  fetch: app.fetch,
}
