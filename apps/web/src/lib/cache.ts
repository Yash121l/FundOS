// TTL cache using Redis when REDIS_URL is set; transparent pass-through otherwise.
// To enable: pnpm --filter @fundos/web add ioredis and set REDIS_URL
// Usage: withCache('key', 300, () => expensiveQuery())

interface MinimalRedis {
  get(key: string): Promise<string | null>
  set(key: string, value: string, exMode: 'EX', ttl: number): Promise<unknown>
  del(...keys: string[]): Promise<number>
  quit(): Promise<void>
}

let _redis: MinimalRedis | null = null
let _initialized = false

async function getRedis(): Promise<MinimalRedis | null> {
  if (_initialized) return _redis
  _initialized = true

  const url = process.env.REDIS_URL
  if (!url) return null

  try {
    // Why new Function: Turbopack and webpack statically resolve all import() and require()
    // calls at bundle time, even inside async functions. Using new Function defers resolution
    // to runtime, preventing a build error when ioredis is not installed.
    //
    // The module string 'ioredis' is a static literal — never user-controlled — so this
    // eval-like call is safe. Considered alternatives: conditional require() (same static
    // analysis problem), separate entry point (adds build complexity), lazy chunk
    // (Turbopack doesn't guarantee optional chunk skipping).
    // eslint-disable-next-line no-new-func
    const load = new Function('m', 'return import(m)')
    const { default: Redis } = await load('ioredis') as { default: new (url: string, opts: object) => MinimalRedis }
    _redis = new Redis(url, { enableOfflineQueue: false })
    return _redis
  } catch {
    _redis = null
    return null
  }
}

// Graceful shutdown — release Redis connection on process exit
if (typeof process !== 'undefined') {
  process.on('SIGTERM', () => {
    if (_redis) void _redis.quit().catch(() => undefined)
  })
}

export async function withCache<T>(
  key: string,
  ttlSeconds: number,
  fn: () => Promise<T>
): Promise<T> {
  if (!key || typeof key !== 'string') {
    throw new TypeError('Cache key must be a non-empty string')
  }
  if (!Number.isFinite(ttlSeconds) || ttlSeconds <= 0) {
    throw new TypeError('TTL must be a positive finite number')
  }

  const redis = await getRedis()

  if (redis) {
    try {
      const cached = await redis.get(key)
      if (cached) return JSON.parse(cached) as T
    } catch {
      // Redis read failure — fall through to live query
    }
  }

  const result = await fn()

  if (redis) {
    try {
      await redis.set(key, JSON.stringify(result), 'EX', ttlSeconds)
    } catch {
      // Redis write failure is non-fatal
    }
  }

  return result
}

export async function invalidateCache(...keys: string[]): Promise<void> {
  const redis = await getRedis()
  if (!redis || keys.length === 0) return
  try {
    await redis.del(...keys)
  } catch {
    // Ignore — cache invalidation failures are non-fatal
  }
}
