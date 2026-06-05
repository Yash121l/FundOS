import { db } from '@fundos/database'
import { MORSubmitForm } from '@/components/monitoring/mor-submit-form'

export const dynamic = 'force-dynamic'

export default async function NewMORPage() {
  const companies = await db.company
    .findMany({
      where: { status: 'ACTIVE' },
      select: { id: true, name: true, slug: true },
      orderBy: { name: 'asc' },
    })
    .catch(() => [])

  return (
    <div className="p-5 max-w-[900px] w-full">
      <div className="mb-6">
        <h1 className="text-[15px] font-semibold text-foreground">Submit Monthly Operations Report</h1>
        <p className="text-[12px] text-muted-foreground mt-0.5">
          Due by the 10th of the following month. P&amp;L, cash, KPIs, and qualitative update.
        </p>
      </div>
      <MORSubmitForm companies={companies} />
    </div>
  )
}
