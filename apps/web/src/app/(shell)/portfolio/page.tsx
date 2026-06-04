import { Suspense } from 'react'
import { getAllCompanies } from '@/lib/portfolio'
import { PortfolioTable } from '@/components/portfolio/portfolio-table'

export const dynamic = 'force-dynamic'

interface Props {
  searchParams: Promise<{ health?: string }>
}

async function PortfolioTableLoader({ health }: { health: string }) {
  const companies = await getAllCompanies()
  return <PortfolioTable data={companies} initialHealth={health} />
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
