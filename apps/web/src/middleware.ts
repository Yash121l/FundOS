import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const SESSION_COOKIE = 'signalos_session'
const PUBLIC_PATHS = ['/sign-in', '/sign-up', '/api/health', '/api/webhooks']

function isPublic(pathname: string) {
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/'))
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Always allow static assets and Next.js internals
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    /\.(?:ico|png|svg|jpg|jpeg|webp|css|js|map|woff2?)$/.test(pathname)
  ) {
    return NextResponse.next()
  }

  // Public routes pass through
  if (isPublic(pathname)) return NextResponse.next()

  // Check for session cookie
  const token = request.cookies.get(SESSION_COOKIE)?.value
  if (!token) {
    const signIn = new URL('/sign-in', request.url)
    signIn.searchParams.set('from', pathname)
    return NextResponse.redirect(signIn)
  }

  // Token exists — let the server component validate it against the DB.
  // Edge middleware cannot query Postgres, so we only do the cookie presence check here.
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-signalos-pathname', pathname)
  return NextResponse.next({
    request: { headers: requestHeaders },
  })
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}
