import { Suspense } from 'react'
import { getAllCompanies } from '@/lib/portfolio'
import { PortfolioTable } from '@/components/portfolio/portfolio-table'
import { AddCompanyModal } from '@/components/portfolio/add-company-modal'
import { CompanyImportModal } from '@/components/portfolio/company-import-modal'
import { ExportButton } from '@/components/portfolio/export-button'

export const dynamic = 'force-dynamic'

interface Props {
  searchParams: Promise<{ health?: string }>
}

async function PortfolioTableLoader({ health }: { health: string }) {
  const companies = await getAllCompanies()
  return (
    <>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <h1 className="text-[16px] font-semibold">Portfolio</h1>
        <div className="flex items-center gap-2">
          <ExportButton data={companies} />
          <CompanyImportModal />
          <AddCompanyModal />
        </div>
      </div>
      <PortfolioTable data={companies} initialHealth={health} />
    </>
  )
}

export default async function PortfolioPage({ searchParams }: Props) {
  const params = await searchParams

  return (
    <div className="p-5">
      <Suspense fallback={<div className="text-[13px] text-muted-foreground p-4">Loading portfolio…</div>}>
        <PortfolioTableLoader health={params.health ?? ''} />
      </Suspense>
    </div>
  )
}
