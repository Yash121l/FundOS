'use client'

import { useState } from 'react'
import { Users, Settings2, User, Shield } from 'lucide-react'
import { UsersTab } from './users-tab'
import { FundTab } from './fund-tab'
import { PreferencesTab } from './preferences-tab'
import { AccountTab } from './account-tab'
import type { SessionUser } from '@/lib/session'
import { cn } from '@/lib/utils'

interface Props {
  me: SessionUser
  isWriter: boolean
  users: Array<{
    id: string; email: string; name: string; role: string
    avatarUrl: string | null; companyId: string | null; emailVerified: Date | null; createdAt: Date
    company: { id: string; name: string; slug: string } | null
  }>
  companies: Array<{ id: string; name: string; slug: string; sector: string; stage: string }>
  lpReports: Array<{ id: string; title: string; quarter: string }>
  fund: {
    id: string; name: string; vintage: number; committedCapital: number
    managementFeePct: number; carryPct: number; hurdleRate: number
    waterfallType: string; currency: string
    investmentPeriodEnd: Date | null; fundTermEnd: Date | null
  } | null
}

type Tab = 'users' | 'fund' | 'preferences' | 'account'

const TABS: Array<{ id: Tab; label: string; icon: typeof Users; writeOnly?: boolean }> = [
  { id: 'users',       label: 'Users & Access', icon: Users,     writeOnly: true },
  { id: 'fund',        label: 'Fund Config',    icon: Settings2, writeOnly: true },
  { id: 'preferences', label: 'Preferences',    icon: Shield },
  { id: 'account',     label: 'Account',        icon: User },
]

export function SettingsShell({ me, isWriter, users, companies, lpReports, fund }: Props) {
  const visibleTabs = TABS.filter((t) => !t.writeOnly || isWriter)
  const [tab, setTab] = useState<Tab>(visibleTabs[0]?.id ?? 'preferences')

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-[18px] font-semibold">Settings</h1>
        <p className="text-[13px] text-muted-foreground mt-0.5">
          Manage users, fund configuration, and preferences.
        </p>
      </div>

      {/* Mobile: horizontal scrollable tab bar */}
      <div className="flex sm:hidden gap-1 overflow-x-auto pb-2 mb-4 border-b border-border">
        {visibleTabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={cn(
              'flex items-center gap-1.5 h-8 px-3 rounded-md text-[12px] font-medium flex-shrink-0 whitespace-nowrap transition-colors',
              tab === id
                ? 'bg-secondary text-foreground'
                : 'text-muted-foreground hover:text-foreground hover:bg-secondary/60'
            )}
          >
            <Icon size={13} className="flex-shrink-0" />
            {label}
          </button>
        ))}
      </div>

      <div className="flex gap-6">
        {/* Desktop: sidebar nav */}
        <aside className="hidden sm:block w-44 flex-shrink-0">
          <nav className="space-y-px">
            {visibleTabs.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setTab(id)}
                className={cn(
                  'w-full flex items-center gap-2.5 h-8 px-3 rounded-md text-[13px] font-medium transition-colors text-left',
                  tab === id
                    ? 'bg-secondary text-foreground'
                    : 'text-muted-foreground hover:text-foreground hover:bg-secondary/60'
                )}
              >
                <Icon size={14} className="flex-shrink-0" />
                {label}
              </button>
            ))}
          </nav>
        </aside>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {tab === 'users'       && <UsersTab me={me} users={users} companies={companies} lpReports={lpReports} />}
          {tab === 'fund'        && <FundTab fund={fund} />}
          {tab === 'preferences' && <PreferencesTab />}
          {tab === 'account'     && <AccountTab me={me} />}
        </div>
      </div>
    </div>
  )
}
