import { redirect } from 'next/navigation'
import { getSessionUser } from '@/lib/session'

function landingPathForRole(role: string): string {
  switch (role) {
    case 'FOUNDER': return '/founder/dashboard'
    case 'LP': return '/lp-reports'
    case 'ADMIN':
    case 'PM':
    case 'ANALYST': return '/'
    default: return '/'
  }
}

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser()
  if (user) redirect(landingPathForRole(user.role))
  return <>{children}</>
}
