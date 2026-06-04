import Link from 'next/link'
import { getCompaniesForForm } from '@/lib/updates'
import { UpdateForm } from '@/components/updates/update-form'

export const dynamic = 'force-dynamic'

interface Props {
  searchParams: Promise<{ company?: string }>
}

export default async function NewUpdatePage({ searchParams }: Props) {
  const params = await searchParams
  const companies = await getCompaniesForForm().catch(() => [])

  // Pre-select company if slug passed via query param
  const defaultCompany = params.company
    ? companies.find((c) => c.slug === params.company)
    : undefined

  return (
    <div className="p-5">
      {/* Page header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 text-[12px] text-muted-foreground mb-1">
          <Link href="/updates" className="hover:text-foreground transition-colors">Updates</Link>
          <span>›</span>
          <span className="text-foreground">New Update</span>
        </div>
        <h1 className="text-[15px] font-semibold text-foreground">Submit Founder Update</h1>
        <p className="text-[12px] text-muted-foreground mt-0.5">
          Takes about 3 minutes · AI analysis runs automatically after submission
        </p>
      </div>

      {companies.length === 0 ? (
        <div className="flex flex-col items-center py-16 text-center">
          <p className="text-[13px] font-medium text-foreground">No companies found</p>
          <p className="text-[12px] text-muted-foreground mt-1">
            The database may not be seeded yet. Run <code className="px-1 py-0.5 rounded bg-secondary text-[11px]">pnpm db:seed</code> to add portfolio companies.
          </p>
        </div>
      ) : (
        <UpdateForm companies={companies} defaultCompanyId={defaultCompany?.id} />
      )}
    </div>
  )
}
