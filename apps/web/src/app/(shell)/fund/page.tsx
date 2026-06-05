import { Suspense } from 'react'
import { getFundPerformance } from '@/lib/fund-performance'
import { FundPerformanceView } from '@/components/fund/fund-performance-view'

export const dynamic = 'force-dynamic'

async function FundLoader() {
  const perf = await getFundPerformance()
  return <FundPerformanceView data={perf} />
}

export default function FundPage() {
  return (
    <div className="p-5">
      <Suspense fallback={<div className="text-[13px] text-muted-foreground">Loading fund performance…</div>}>
        <FundLoader />
      </Suspense>
    </div>
  )
}
