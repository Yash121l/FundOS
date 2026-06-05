'use client'

import { useState, useRef, useEffect } from 'react'
import { MoreHorizontal, BarChart3, GitBranch, TrendingUp, ClipboardList, Settings2 } from 'lucide-react'
import { LogMetricsModal } from './log-metrics-modal'
import { LogMrrBridgeModal } from '@/components/financials/log-mrr-bridge-modal'
import { LogUnitEconomicsModal } from '@/components/financials/log-unit-economics-modal'
import { MeetingPrepButton } from './meeting-prep-button'
import { EditCompanySheet } from './edit-company-sheet'

type ActiveModal = null | 'metrics' | 'mrr' | 'unitEcon' | 'meetingPrep' | 'edit'

interface Company {
  id: string; name: string; sector: string; stage: string; country: string
  website: string | null; foundedYear: number | null; description: string | null
  status: string; healthStatus: string; logoUrl?: string | null
}

interface Props {
  companyId: string
  companyName: string
  company: Company
}

const ITEMS = [
  { key: 'metrics' as const, icon: BarChart3, label: 'Log Metrics' },
  { key: 'mrr' as const, icon: GitBranch, label: 'MRR Bridge' },
  { key: 'unitEcon' as const, icon: TrendingUp, label: 'Unit Economics' },
  { key: 'meetingPrep' as const, icon: ClipboardList, label: 'Meeting Prep' },
  { key: 'edit' as const, icon: Settings2, label: 'Edit Company' },
]

export function CompanyActionsMenu({ companyId, companyName, company }: Props) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [activeModal, setActiveModal] = useState<ActiveModal>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!menuOpen) return
    function handle(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [menuOpen])

  function trigger(key: ActiveModal) {
    setMenuOpen(false)
    setActiveModal(key)
  }

  function close() { setActiveModal(null) }

  return (
    <div ref={menuRef} className="relative print:hidden">
      <button
        type="button"
        onClick={() => setMenuOpen((v) => !v)}
        aria-label="Company actions"
        className="h-7 w-7 flex items-center justify-center rounded-md border border-border text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
      >
        <MoreHorizontal size={15} />
      </button>

      {menuOpen && (
        <div className="absolute right-0 top-8 z-50 w-48 rounded-xl border border-border bg-card shadow-xl py-1">
          {ITEMS.map(({ key, icon: Icon, label }) => (
            <button
              key={key}
              type="button"
              onClick={() => trigger(key)}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-[12px] text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors text-left"
            >
              <Icon size={13} className="flex-shrink-0" />
              {label}
            </button>
          ))}
        </div>
      )}

      <LogMetricsModal
        companyId={companyId} companyName={companyName}
        open={activeModal === 'metrics'} onOpenChange={(o) => { if (!o) close() }}
      />
      <LogMrrBridgeModal
        companyId={companyId} companyName={companyName}
        open={activeModal === 'mrr'} onOpenChange={(o) => { if (!o) close() }}
      />
      <LogUnitEconomicsModal
        companyId={companyId} companyName={companyName}
        open={activeModal === 'unitEcon'} onOpenChange={(o) => { if (!o) close() }}
      />
      <MeetingPrepButton
        companyId={companyId} companyName={companyName}
        open={activeModal === 'meetingPrep'} onOpenChange={(o) => { if (!o) close() }}
      />
      <EditCompanySheet
        company={company}
        open={activeModal === 'edit'} onOpenChange={(o) => { if (!o) close() }}
      />
    </div>
  )
}
