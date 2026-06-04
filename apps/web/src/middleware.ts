import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'

const isPublicRoute = createRouteMatcher([
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/api/health',
  // Webhooks are public — they use their own HMAC-based auth.
  '/api/webhooks(.*)',
])

const isFounderRoute = createRouteMatcher(['/founder(.*)'])
const isInternalRoute = createRouteMatcher([
  '/',
  '/portfolio(.*)',
  '/updates(.*)',
  '/trends(.*)',
  '/intelligence(.*)',
  '/ask(.*)',
])

export default clerkMiddleware(async (auth, req) => {
  if (isPublicRoute(req)) return NextResponse.next()

  await auth.protect()

  // Role comes from Clerk sessionClaims (publicMetadata), not the DB.
  // Middleware runs on the edge where Prisma/Postgres is unavailable, so we
  // rely on Clerk's JWT — setUserRole() keeps publicMetadata in sync with the DB.
  // If no role is set yet (new user, metadata not written), we fall through
  // and let the server component enforce access via getCurrentUser().
  const { sessionClaims } = await auth()
  const role = (sessionClaims?.publicMetadata as { role?: string } | undefined)?.role

  if (role === 'FOUNDER' && isInternalRoute(req)) {
    return NextResponse.redirect(new URL('/founder/dashboard', req.url))
  }

  if (role === 'LP' && (isInternalRoute(req) || isFounderRoute(req))) {
    return NextResponse.redirect(new URL('/lp-reports', req.url))
  }

  // Prevent internal users from accidentally landing on the founder portal.
  if (role && role !== 'FOUNDER' && role !== 'LP' && isFounderRoute(req)) {
    return NextResponse.redirect(new URL('/', req.url))
  }

  return NextResponse.next()
})

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
    '/__clerk/(.*)',
  ],
}
