'use client'

import { useState } from 'react'
import { ClipboardList } from 'lucide-react'
import { MeetingPrepSheet } from './meeting-prep-sheet'

interface Props {
  companyId: string
  companyName: string
}

export function MeetingPrepButton({ companyId, companyName }: Props) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="h-7 px-3 rounded-md border border-border bg-card text-[12px] text-muted-foreground hover:text-foreground hover:bg-secondary flex items-center gap-1.5 transition-colors"
      >
        <ClipboardList size={12} />
        Meeting Prep
      </button>

      {open && (
        <MeetingPrepSheet
          companyId={companyId}
          companyName={companyName}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  )
}
