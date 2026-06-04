import Link from 'next/link'
import { getUpdatesForInbox } from '@/lib/updates'
import { Inbox } from '@/components/updates/inbox'

export const dynamic = 'force-dynamic'

export default async function UpdatesPage() {
  const updates = await getUpdatesForInbox().catch(() => [])

  return (
    <div className="p-5 max-w-3xl">
      {/* Page header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-[15px] font-semibold text-foreground">Founder Updates</h1>
          <p className="text-[12px] text-muted-foreground mt-0.5">
            Review portfolio company updates and AI analysis
          </p>
        </div>
        <Link
          href="/updates/new"
          className="h-8 px-3.5 rounded-md bg-primary text-primary-foreground text-[12px] font-medium hover:bg-primary/90 transition-colors inline-flex items-center gap-1.5"
        >
          + New Update
        </Link>
      </div>

      <Inbox initialUpdates={updates} />
    </div>
  )
}
