'use client'

import { Suspense, useEffect } from 'react'
import { useActionState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { signIn } from '@/lib/auth-actions'
import { TrendingUp, BarChart3, Zap, AlertCircle } from 'lucide-react'

const init = { error: '', redirectTo: '' }

const STATS = [
  { label: 'Portfolio Companies', value: '22+', icon: BarChart3 },
  { label: 'Trend Signals', value: 'Live', icon: TrendingUp },
  { label: 'Metrics Tracked', value: '400+', icon: Zap },
]

function SignInForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const from = searchParams.get('from') ?? '/'
  const [state, action, pending] = useActionState(signIn, init)

  useEffect(() => {
    if (state?.redirectTo) router.replace(state.redirectTo)
  }, [router, state?.redirectTo])

  return (
    <div className="min-h-screen flex bg-background">

      {/* ── Left: brand / hero panel ─────────────────────────── */}
      <div className="hidden lg:flex flex-col flex-1 relative overflow-hidden bg-card border-r border-border">

        {/* Ambient glow */}
        <div className="pointer-events-none absolute -top-40 -right-40 h-[500px] w-[500px] rounded-full bg-primary/10 blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 left-0 h-[300px] w-[300px] rounded-full bg-primary/5 blur-3xl" />

        {/* Dot grid */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.035]"
          style={{
            backgroundImage: 'radial-gradient(circle, var(--color-foreground) 1px, transparent 1px)',
            backgroundSize: '28px 28px',
          }}
        />

        {/* Content */}
        <div className="relative z-10 flex flex-col h-full px-14 py-12">

          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center flex-shrink-0">
              <div className="h-[14px] w-[14px] rounded-sm bg-black/70" />
            </div>
            <span className="text-[15px] font-semibold tracking-tight">SignalOS</span>
          </div>

          {/* Headline */}
          <div className="mt-16 mb-auto">
            <p className="text-[11px] font-semibold tracking-[0.14em] uppercase text-primary mb-4">
              Venture Intelligence Platform
            </p>
            <h1 className="text-[38px] font-semibold tracking-tight leading-[1.08] text-foreground">
              Portfolio operations<br />at a different scale.
            </h1>
            <p className="mt-4 text-[14px] text-muted-foreground leading-relaxed max-w-[360px]">
              Real-time portfolio health, founder updates, LP reporting, and market intelligence — unified for fund teams.
            </p>

            {/* Stat chips */}
            <div className="mt-10 flex gap-3">
              {STATS.map(({ label, value, icon: Icon }) => (
                <div
                  key={label}
                  className="flex-1 rounded-xl border border-border bg-secondary/50 px-4 py-3.5"
                >
                  <Icon className="h-3.5 w-3.5 text-primary mb-2.5" strokeWidth={2} />
                  <div className="text-[22px] font-semibold tracking-tight tabular-nums">{value}</div>
                  <div className="text-[11px] text-muted-foreground mt-0.5 leading-tight">{label}</div>
                </div>
              ))}
            </div>

            {/* Feature highlights */}
            <div className="mt-8 rounded-xl border border-border bg-secondary/30 p-4">
              <p className="text-[10px] font-semibold tracking-[0.12em] uppercase text-muted-foreground mb-3">
                What&apos;s Inside
              </p>
              <div className="flex flex-wrap gap-2">
                {['Portfolio Health', 'MOR Analysis', 'LP Reporting', 'Cap Table', 'Board Meetings', 'Market Signals', 'Waterfall Calc', 'AI Insights'].map((feature) => (
                  <span
                    key={feature}
                    className="inline-flex items-center rounded-full border border-border bg-card px-2.5 py-1 text-[11px] text-foreground/80"
                  >
                    {feature}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-auto pt-8 flex items-center gap-2 text-[11px] text-muted-foreground/40">
            <div className="h-3 w-px bg-border" />
            <span>RTP Global · Fund III · Confidential</span>
          </div>
        </div>
      </div>

      {/* ── Right: form panel ────────────────────────────────── */}
      <div className="w-full lg:w-[420px] flex-shrink-0 flex flex-col items-center justify-center px-5 sm:px-8 py-12">
        <div className="w-full max-w-[340px]">

          {/* Mobile-only logo */}
          <div className="flex items-center gap-2.5 mb-10 lg:hidden">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
              <div className="h-[14px] w-[14px] rounded-sm bg-black/70" />
            </div>
            <span className="text-[15px] font-semibold">SignalOS</span>
          </div>

          <div className="mb-8">
            <h2 className="text-[22px] font-semibold tracking-tight">Sign in</h2>
            <p className="text-[13px] text-muted-foreground mt-1">Access your fund workspace</p>
          </div>

          <form action={action} className="space-y-3.5">
            <input type="hidden" name="from" value={from} />

            <div className="space-y-1.5">
              <label htmlFor="email" className="text-[11px] font-semibold tracking-[0.1em] uppercase text-muted-foreground">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                placeholder="you@fund.vc"
                className="input w-full h-10 text-[13px]"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="password" className="text-[11px] font-semibold tracking-[0.1em] uppercase text-muted-foreground">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                placeholder="••••••••"
                className="input w-full h-10 text-[13px]"
              />
            </div>

            {state?.error && (
              <div className="flex items-start gap-2 rounded-lg border border-destructive/25 bg-destructive/10 px-3 py-2.5">
                <AlertCircle className="h-3.5 w-3.5 text-destructive mt-0.5 flex-shrink-0" />
                <p className="text-[12px] text-destructive leading-relaxed">{state.error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={pending || !!state?.redirectTo}
              className="w-full h-10 rounded-lg bg-primary text-[13px] font-semibold transition-all hover:opacity-90 active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed mt-1"
              style={{ color: 'var(--color-primary-foreground)' }}
            >
              {pending || state?.redirectTo ? 'Signing in…' : 'Continue →'}
            </button>
          </form>

          <p className="mt-8 text-center text-[11px] text-muted-foreground/40 leading-relaxed">
            Access is by invitation only.<br />Contact your fund administrator.
          </p>
        </div>
      </div>
    </div>
  )
}

export default function SignInPage() {
  return (
    <Suspense>
      <SignInForm />
    </Suspense>
  )
}
