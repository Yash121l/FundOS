import type { Metadata } from 'next'
import { ClerkProvider } from '@clerk/nextjs'
import './globals.css'

export const metadata: Metadata = {
  title: {
    default: 'FundOS',
    template: '%s — FundOS',
  },
  description: 'AI-native operating system for venture capital firms',
}

const clerkKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const content = (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-background font-sans antialiased">
        {children}
      </body>
    </html>
  )

  if (!clerkKey) return content

  return <ClerkProvider>{content}</ClerkProvider>
}
