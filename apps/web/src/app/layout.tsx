import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
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

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
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
}
