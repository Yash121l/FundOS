// Client-side instrumentation (Next.js runs this before the app hydrates).
// PostHog product analytics. Events go through the /ingest reverse proxy
// (see next.config.ts) so ad blockers don't drop them.
//
// FundOS holds fund, portfolio and LP data, so replays mask every input and all
// text, and users are identified by internal id only (see lib/observability.ts).
import posthog from 'posthog-js'

const key = process.env.NEXT_PUBLIC_POSTHOG_KEY
const isLocalhost =
  typeof window !== 'undefined' &&
  ['localhost', '127.0.0.1', '[::1]'].includes(window.location.hostname)
const allowDev = process.env.NEXT_PUBLIC_POSTHOG_DEV === '1'
const enabled = !!key && (allowDev || (process.env.NODE_ENV === 'production' && !isLocalhost))

if (enabled && key) {
  posthog.init(key, {
    api_host: '/ingest',
    ui_host: 'https://us.posthog.com',
    defaults: '2026-08-30',
    capture_pageview: 'history_change',
    capture_pageleave: true,
    autocapture: true,
    enable_heatmaps: true,
    capture_dead_clicks: true,
    capture_exceptions: true,
    capture_performance: { web_vitals: true },
    session_recording: {
      maskAllInputs: true,
      maskTextSelector: '*',
    },
  })
  posthog.register({ app: 'fundos' })
}
