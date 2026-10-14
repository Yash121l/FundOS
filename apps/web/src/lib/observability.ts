// PostHog helpers, browser-side only. PostHog is initialised in
// src/instrumentation-client.ts; when it isn't (localhost, no key) every call
// here is a no-op because posthog-js ignores calls before init.
//
// FundOS is a sensitive app: never pass company names, financial figures,
// free text, emails or names as event or person properties. Ids, enums and
// counts only.
import posthog from 'posthog-js'

function ready(): boolean {
  return typeof window !== 'undefined' && posthog.__loaded === true
}

export function captureException(err: unknown, context?: Record<string, unknown>): void {
  if (!ready()) return
  try {
    posthog.captureException(err, context)
  } catch (captureErr) {
    console.error('[observability] captureException failed', { captureErr, originalErr: err })
  }
}

/** Identify by internal user id only. Role is the only person property. */
export function identifyUser(userId: string, role?: string): void {
  if (!ready()) return
  try {
    if (posthog.get_distinct_id() !== userId) {
      posthog.identify(userId, role ? { role } : undefined)
    }
  } catch (err) {
    console.error('[observability] identifyUser failed', { err })
  }
}

export function resetUser(): void {
  if (!ready()) return
  try {
    posthog.reset()
  } catch (err) {
    console.error('[observability] resetUser failed', { err })
  }
}

export type TrackedEvent =
  | 'founder_update_submitted'
  | 'company_added'
  | 'metrics_logged'
  | 'lp_report_generated'
  | 'ask_question_answered'
  | 'user_invited'

export function trackEvent(event: TrackedEvent, properties?: Record<string, string | number | boolean | null>): void {
  if (!ready()) return
  try {
    posthog.capture(event, properties)
  } catch (err) {
    console.error('[observability] trackEvent failed', { event, err })
  }
}
