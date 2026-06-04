'use client'

import { createContext, useContext, useState } from 'react'
import { CommandPalette } from '@/components/shell/command-palette'

interface CommandPaletteCtx {
  open: () => void
  close: () => void
}

const Ctx = createContext<CommandPaletteCtx | null>(null)

export function CommandPaletteProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false)
  return (
    <Ctx.Provider value={{ open: () => setIsOpen(true), close: () => setIsOpen(false) }}>
      {children}
      <CommandPalette open={isOpen} onOpenChange={setIsOpen} />
    </Ctx.Provider>
  )
}

export function useCommandPalette() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useCommandPalette must be inside CommandPaletteProvider')
  return ctx
}
