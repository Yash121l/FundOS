import { redirect } from 'next/navigation'

// Self-registration is disabled — analysts invite users via Settings.
export default function SignUpPage() {
  redirect('/sign-in')
}
