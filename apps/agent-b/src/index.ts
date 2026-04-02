import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { agentCardRoute } from './routes/agent-card.js'
import { priceRoute } from './routes/price.js'

const app = new Hono()

app.use('*', logger())
app.use('*', cors())

app.get('/health', (c) => c.json({ status: 'ok', agent: 'kinko-agent-b' }))
app.route('/.well-known', agentCardRoute)
app.route('/api', priceRoute)

const port = Number(process.env.PORT ?? 3002)
console.log(`Kinko Agent B running on http://localhost:${port}`)

export default { port, fetch: app.fetch }
