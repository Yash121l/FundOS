import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { ClerkProvider } from '@clerk/nextjs'
import { QueryProvider } from '@/components/providers/query-provider'
import { CommandPaletteProvider } from '@/components/providers/command-palette-provider'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

export const metadata: Metadata = {
  title: { default: 'SignalOS', template: '%s — SignalOS' },
  description: 'AI-native operating system for venture capital firms',
}

const clerkKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const content = (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <body className="min-h-screen bg-background font-sans antialiased">
        <QueryProvider>
          <CommandPaletteProvider>
            {children}
          </CommandPaletteProvider>
        </QueryProvider>
      </body>
    </html>
  )

  if (!clerkKey) return content
  return <ClerkProvider>{content}</ClerkProvider>
}
