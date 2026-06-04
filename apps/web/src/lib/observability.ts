// PostHog observability helpers — browser-side only.
// Sentry (server-side) is initialised in instrumentation.ts.
// To enable PostHog: pnpm --filter @fundos/web add posthog-js
//   NEXT_PUBLIC_POSTHOG_KEY=phc_...
//   NEXT_PUBLIC_POSTHOG_HOST=https://app.posthog.com

interface PostHogInstance {
  init(key: string, options?: Record<string, unknown>): void
  capture(event: string, properties?: Record<string, unknown>): void
  identify(id: string, traits?: Record<string, unknown>): void
}

// new Function prevents Turbopack from statically resolving the optional package
// eslint-disable-next-line no-new-func
const dynamicImport = new Function('m', 'return import(m)') as (m: string) => Promise<{ default: PostHogInstance }>

let cachedPostHog: PostHogInstance | null | undefined = undefined

async function getPostHog(): Promise<PostHogInstance | null> {
  if (cachedPostHog !== undefined) return cachedPostHog
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY
  const host = process.env.NEXT_PUBLIC_POSTHOG_HOST
  if (typeof window === 'undefined' || !key) {
    cachedPostHog = null
    return null
  }
  try {
    const { default: posthog } = await dynamicImport('posthog-js')
    posthog.init(key, { api_host: host ?? 'https://app.posthog.com' })
    cachedPostHog = posthog
    return posthog
  } catch {
    cachedPostHog = null
    return null
  }
}

export function captureException(err: unknown, context?: Record<string, unknown>): void {
  const errorDetails = err instanceof Error
    ? { name: err.name, message: err.message, stack: err.stack }
    : { message: String(err) }
  const payload = { ...errorDetails, ...context }

  void (async () => {
    try {
      // Race against a 2s timeout to reduce dropped events during page unload (PostHog slow-load scenario)
      const ph = await Promise.race([
        getPostHog(),
        new Promise<null>((resolve) => setTimeout(() => resolve(null), 2000)),
      ])
      ph?.capture('exception', payload)
    } catch (captureErr) {
      console.error('[observability] captureException failed', { captureErr, originalErr: err })
    }
  })()
}

export function identifyUser(userId: string, traits?: Record<string, unknown>): void {
  void (async () => {
    try {
      const ph = await getPostHog()
      ph?.identify(userId, traits)
    } catch (err) {
      console.error('[observability] identifyUser failed', { userId, err })
    }
  })()
}

export function trackEvent(event: string, properties?: Record<string, unknown>): void {
  void (async () => {
    try {
      const ph = await getPostHog()
      ph?.capture(event, properties)
    } catch (err) {
      console.error('[observability] trackEvent failed', { event, err })
    }
  })()
}
