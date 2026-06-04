import { getAllCompanies } from '@/lib/portfolio'
import { PortfolioTable } from '@/components/portfolio/portfolio-table'

export const dynamic = 'force-dynamic'

interface Props {
  searchParams: Promise<{ health?: string }>
}

export default async function PortfolioPage({ searchParams }: Props) {
  const params = await searchParams
  const [companies] = await Promise.all([getAllCompanies()])

  return (
    <div className="p-5">
      <PortfolioTable data={companies} initialHealth={params.health ?? ''} />
    </div>
  )
}
