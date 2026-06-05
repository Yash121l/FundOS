import Link from 'next/link'
import { cn } from '@/lib/utils'

interface Props {
  companySlug: string
  activeTab: string
}

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'saas', label: 'SaaS Metrics' },
  { id: 'financials', label: 'Financials' },
  { id: 'investments', label: 'Investments' },
  { id: 'captable', label: 'Cap Table' },
]

export function CompanyDetailTabs({ companySlug, activeTab }: Props) {
  return (
    <div className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-none">
      {TABS.map((tab) => (
        <Link
          key={tab.id}
          href={`/portfolio/${companySlug}?tab=${tab.id}`}
          className={cn(
            'flex-shrink-0 h-7 px-3 rounded-md text-[12px] font-medium transition-colors',
            activeTab === tab.id
              ? 'bg-secondary text-foreground'
              : 'text-muted-foreground hover:text-foreground hover:bg-secondary/60'
          )}
        >
          {tab.label}
        </Link>
      ))}
    </div>
  )
}
