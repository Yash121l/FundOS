import { Hono } from 'hono'
import { serve } from '@hono/node-server'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { secureHeaders } from 'hono/secure-headers'

const app = new Hono()

// Middleware
app.use('*', logger())
app.use('*', secureHeaders())
app.use(
  '/api/*',
  cors({
    origin: process.env['ALLOWED_ORIGINS']?.split(',') ?? ['http://localhost:3000'],
    credentials: true,
  })
)

// Health check (public)
app.get('/health', (c) =>
  c.json({ status: 'ok', service: 'signalos-api', timestamp: new Date().toISOString() })
)

// API routes — implemented per phase
app.get('/api/v1', (c) => c.json({ version: '1.0.0', status: 'ready' }))

// 404 handler
app.notFound((c) => c.json({ error: 'Not found' }, 404))

// Error handler
app.onError((err, c) => {
  console.error('[API Error]', err)
  return c.json({ error: 'Internal server error' }, 500)
})

const port = parseInt(process.env['PORT'] ?? '3001', 10)
// Bind to 0.0.0.0 so the server is reachable inside Docker networks and from the host.
const hostname = process.env['HOST'] ?? '0.0.0.0'

serve({ fetch: app.fetch, port, hostname }, () => {
  console.log(`[API] Running on http://${hostname}:${port}`)
})

export default app
