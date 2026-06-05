'use client'

import { Download } from 'lucide-react'
import { exportPortfolioCsv } from '@/lib/export-utils'
import type { CompanyRow } from '@/lib/portfolio'

interface Props {
  data: CompanyRow[]
}

export function ExportButton({ data }: Props) {
  function handleExport() {
    exportPortfolioCsv(data)
  }

  return (
    <button
      onClick={handleExport}
      className="flex items-center gap-1.5 h-8 px-3 rounded-lg border border-border text-[12px] text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
    >
      <Download size={13} />
      Export CSV
    </button>
  )
}
