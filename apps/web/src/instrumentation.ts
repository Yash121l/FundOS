// Next.js instrumentation hook — runs at server startup
// Initializes Sentry when SENTRY_DSN is set and @sentry/nextjs is installed
// Install: pnpm --filter @fundos/web add @sentry/nextjs

async function initSentry(runtime: 'nodejs' | 'edge') {
  try {
    const Sentry = await import('@sentry/nextjs' as never) as {
      init: (opts: Record<string, unknown>) => void
    }
    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      environment: process.env.NODE_ENV ?? 'development',
      tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
      debug: false,
    })
  } catch (err) {
    // MODULE_NOT_FOUND is expected when Sentry isn't installed — skip logging
    const code = (err as { code?: string }).code
    if (code !== 'MODULE_NOT_FOUND') {
      const message = err instanceof Error ? err.message : String(err)
      console.error('[instrumentation] Sentry init failed', {
        runtime,
        env: process.env.NODE_ENV,
        error: message,
      })
    }
  }
}

export async function register() {
  if (!process.env.SENTRY_DSN) return

  const runtime = process.env.NEXT_RUNTIME

  if (runtime === 'nodejs') {
    await initSentry('nodejs')
  } else if (runtime === 'edge') {
    await initSentry('edge')
  } else {
    console.warn('[instrumentation] Unknown NEXT_RUNTIME:', runtime, '— Sentry not initialized')
  }
}
