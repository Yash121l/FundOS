'use client'

import { useEffect } from 'react'
import { identifyUser } from '@/lib/observability'

/** Ties the PostHog person to the signed-in user's internal id (no email or name). */
export function PostHogIdentify({ userId, role }: { userId: string; role: string }) {
  useEffect(() => {
    identifyUser(userId, role)
  }, [userId, role])
  return null
}
