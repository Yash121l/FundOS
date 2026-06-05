import { Suspense } from 'react'
import { getBoardDashboard } from '@/lib/board-actions'
import { BoardDashboardView } from '@/components/board/board-dashboard'

export const dynamic = 'force-dynamic'

async function BoardContent() {
  const data = await getBoardDashboard().catch((err) => {
    console.error('[BoardContent] getBoardDashboard failed', err)
    return {
      meetings: [],
      followOnNotes: [],
      valueAdd: [],
      valuations: [],
    }
  })

  return <BoardDashboardView data={data} />
}

export default function BoardPage() {
  return (
    <Suspense fallback={<div className="p-5 text-[13px] text-muted-foreground animate-pulse">Loading board data…</div>}>
      <BoardContent />
    </Suspense>
  )
}
