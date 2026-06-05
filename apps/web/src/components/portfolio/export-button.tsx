'use client'

import { useState } from 'react'
import { Download } from 'lucide-react'
import { exportPortfolioCsv } from '@/lib/export-utils'
import { getPortfolioExportData } from '@/lib/portfolio-actions'

export function ExportButton() {
  const [loading, setLoading] = useState(false)

  async function handleExport() {
    setLoading(true)
    try {
      const data = await getPortfolioExportData()
      exportPortfolioCsv(data)
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleExport}
      disabled={loading}
      className="flex items-center gap-1.5 h-8 px-3 rounded-lg border border-border text-[12px] text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors disabled:opacity-50"
    >
      <Download size={13} />
      {loading ? 'Exporting…' : 'Export CSV'}
    </button>
  )
}
