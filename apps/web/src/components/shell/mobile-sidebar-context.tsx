'use client'

import { createContext, useContext, useState, useEffect, useCallback } from 'react'

interface MobileSidebarContextValue {
  isOpen: boolean
  open: () => void
  close: () => void
}

const MobileSidebarContext = createContext<MobileSidebarContextValue>({
  isOpen: false,
  open: () => {},
  close: () => {},
})

export function MobileSidebarProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false)

  const open = useCallback(() => setIsOpen(true), [])
  const close = useCallback(() => setIsOpen(false), [])

  // Prevent body scroll when sidebar is open on mobile
  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  return (
    <MobileSidebarContext.Provider value={{ isOpen, open, close }}>
      {children}
    </MobileSidebarContext.Provider>
  )
}

export const useMobileSidebar = () => useContext(MobileSidebarContext)
