'use client'

import { useState, startTransition } from 'react'
import { Shield, CheckCircle2, AlertTriangle, DollarSign, Users, Calendar, FileText } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { LPManagementData } from '@/lib/lp-management-actions'
import { issueCapitalCall, recordLPPayment, saveLPACMinutes, signLPAgreement, grantLPPortalAccess } from '@/lib/lp-management-actions'

const TABS = ['LP Entities', 'Capital Calls', 'Distributions', 'LPAC'] as const
type Tab = typeof TABS[number]

const KYC_STYLES: Record<string, string> = {
  NOT_STARTED: 'bg-secondary/50 text-muted-foreground border-border',
  IN_PROGRESS: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  APPROVED: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  REJECTED: 'bg-red-500/10 text-red-400 border-red-500/20',
  EXPIRED: 'bg-red-500/10 text-red-400 border-red-500/20',
}

const FATF_STYLES: Record<string, string> = {
  CLEAR: 'text-emerald-400',
  GREYLIST: 'text-amber-400',
  BLACKLIST: 'text-red-400',
}

const CALL_STATUS_STYLES: Record<string, string> = {
  DRAFT: 'bg-secondary/50 text-muted-foreground border-border',
  ISSUED: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  PARTIALLY_PAID: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  FULLY_PAID: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  OVERDUE: 'bg-red-500/10 text-red-400 border-red-500/20',
}

const DIST_TYPE_LABELS: Record<string, string> = {
  RETURN_OF_CAPITAL: 'Return of Capital',
  PREFERRED_RETURN: 'Preferred Return',
  CARRIED_INTEREST: 'Carried Interest',
  RESIDUAL: 'Residual',
}

const LPAC_TYPE_LABELS: Record<string, string> = {
  CONFLICT_REVIEW: 'Conflict Review',
  VALUATION_APPROVAL: 'Valuation Approval',
  MATERIAL_DECISION: 'Material Decision',
  ROUTINE: 'Routine',
  ANNUAL: 'Annual',
}

interface Props { data: LPManagementData }

function fmtM(n: number) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`
  return `$${Math.round(n)}`
}

function fmtPct(n: number) {
  return `${(n * 100).toFixed(1)}%`
}

export function LPManagementView({ data }: Props) {
  const { lpEntities, capitalCalls, distributions, lpacMeetings } = data
  const [tab, setTab] = useState<Tab>('LP Entities')
  const [actionError, setActionError] = useState<string | null>(null)

  // Total LP stats
  const totalCommitment = lpEntities.reduce((s, lp) => s + lp.capitalCommitment, 0)
  const totalCalled = lpEntities.reduce((s, lp) => s + lp.capitalCalled, 0)
  const totalDistributed = lpEntities.reduce((s, lp) => s + lp.capitalDistributed, 0)
  const approvedLPs = lpEntities.filter((lp) => lp.kycStatus === 'APPROVED').length
  const kycPending = lpEntities.filter((lp) => lp.kycStatus === 'IN_PROGRESS' || lp.kycStatus === 'NOT_STARTED').length

  return (
    <div className="space-y-5">
      {actionError && (
        <p className="text-[12px] text-red-400 px-1">{actionError}</p>
      )}
      {/* Summary stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Total Commitment', value: fmtM(totalCommitment), icon: DollarSign, sub: `${lpEntities.length} LPs` },
          { label: 'Called to Date', value: fmtM(totalCalled), icon: CheckCircle2, sub: `${totalCommitment > 0 ? fmtPct(totalCalled / totalCommitment) : '0%'} call rate` },
          { label: 'Distributed', value: fmtM(totalDistributed), icon: FileText, sub: 'Total returned to LPs' },
          { label: 'KYC Approved', value: approvedLPs, icon: Shield, sub: `${kycPending} pending review` },
        ].map(({ label, value, icon: Icon, sub }) => (
          <div key={label} className="rounded-xl border border-border bg-card px-4 py-3.5">
            <div className="flex items-start justify-between mb-2">
              <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide">{label}</p>
              <Icon size={14} className="text-muted-foreground" />
            </div>
            <p className="text-[20px] font-semibold text-foreground tabular-nums">{value}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">{sub}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={cn(
              'px-3 py-2 text-[12px] font-medium border-b-2 -mb-px transition-colors flex-shrink-0 whitespace-nowrap',
              tab === t
                ? 'border-primary text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            )}
          >
            {t}
          </button>
        ))}
      </div>

      {/* LP Entities */}
      {tab === 'LP Entities' && (
        <div className="space-y-3">
          {/* Onboarding process explanation */}
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="text-[11px] font-semibold text-foreground mb-2">LP Onboarding Process</p>
            <div className="flex items-center gap-2 flex-wrap text-[11px] text-muted-foreground">
              {['KYC/AML Checks', 'FATF Compliance', 'LP Agreement Signed', 'Capital Commitment', 'Portal Access'].map((step, i) => (
                <div key={step} className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-secondary text-[9px] font-semibold flex items-center justify-center text-foreground flex-shrink-0">{i + 1}</span>
                  <span>{step}</span>
                  {i < 4 && <span className="text-muted-foreground/40">→</span>}
                </div>
              ))}
            </div>
          </div>

          {lpEntities.length === 0 ? (
            <EmptyState icon={Users} title="No LP entities" sub="LP investors will appear here once added." />
          ) : (
            <div className="rounded-xl border border-border overflow-hidden">
              <div className="hidden sm:grid grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr] gap-4 px-4 py-2 border-b border-border bg-card/50">
                {['LP Name', 'Type', 'KYC', 'FATF', 'Commitment', 'Agreement'].map((col) => (
                  <p key={col} className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">{col}</p>
                ))}
              </div>
              {lpEntities.map((lp) => (
                <div key={lp.id} className="flex flex-col gap-2 sm:grid sm:grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr] sm:gap-4 px-4 py-3 border-b border-border last:border-0 hover:bg-secondary/10 transition-colors items-start sm:items-center">
                  <div>
                    <p className="text-[12px] font-medium text-foreground">{lp.name}</p>
                    {lp.contactName && <p className="text-[10px] text-muted-foreground">{lp.contactName}</p>}
                    {lp.jurisdiction && <p className="text-[10px] text-muted-foreground">{lp.jurisdiction}</p>}
                  </div>
                  <p className="text-[11px] text-muted-foreground">{lp.entityType.replace(/_/g, ' ')}</p>
                  <span className={cn('inline-flex items-center rounded border px-2 py-0.5 text-[9px] font-semibold uppercase w-fit', KYC_STYLES[lp.kycStatus])}>
                    {String(lp.kycStatus ?? '').replace(/_/g, ' ')}
                  </span>
                  <div className="flex items-center gap-1.5">
                    {lp.fatfStatus === 'CLEAR' ? <CheckCircle2 size={11} className="text-emerald-400" /> : <AlertTriangle size={11} className="text-amber-400" />}
                    <span className={cn('text-[11px] font-medium', FATF_STYLES[lp.fatfStatus])}>{lp.fatfStatus}</span>
                  </div>
                  <div>
                    <p className="text-[12px] font-semibold text-foreground tabular-nums">{fmtM(lp.capitalCommitment)}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {fmtM(lp.unfundedCommitment)} unfunded
                    </p>
                  </div>
                  <div>
                    {lp.agreementSignedAt ? (
                      <div className="flex items-center gap-1 text-emerald-400">
                        <CheckCircle2 size={11} />
                        <span className="text-[10px]">Signed {new Date(lp.agreementSignedAt).getFullYear()}</span>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          startTransition(async () => {
                            try { await signLPAgreement(lp.id, 'v1.0') }
                            catch (err) { setActionError(err instanceof Error ? err.message : 'Failed to sign agreement.') }
                          })
                        }}
                        className="text-[10px] text-primary hover:underline"
                      >
                        Sign agreement
                      </button>
                    )}
                    {!lp.portalAccessGrantedAt && lp.agreementSignedAt && (
                      <button
                        type="button"
                        onClick={() => {
                          startTransition(async () => {
                            try { await grantLPPortalAccess(lp.id) }
                            catch (err) { setActionError(err instanceof Error ? err.message : 'Failed to grant portal access.') }
                          })
                        }}
                        className="block text-[10px] text-muted-foreground hover:text-primary mt-0.5 transition-colors"
                      >
                        Grant portal access
                      </button>
                    )}
                    {lp.portalAccessGrantedAt && (
                      <p className="text-[10px] text-emerald-400/60 flex items-center gap-1 mt-0.5">
                        <Shield size={9} /> Portal active
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Capital Calls */}
      {tab === 'Capital Calls' && (
        <div className="space-y-3">
          <p className="text-[11px] text-muted-foreground">
            Drawdown notices issued pro-rata per LP commitment. 10–15 business day payment window. Wire instructions included in each notice.
          </p>
          {capitalCalls.length === 0 ? (
            <EmptyState icon={DollarSign} title="No capital calls" sub="Capital calls will appear here once issued." />
          ) : (
            <div className="space-y-4">
              {capitalCalls.map((call) => {
                const totalDue = call.allocations.reduce((s, a) => s + a.amountDue, 0)
                const totalPaid = call.allocations.reduce((s, a) => s + a.amountPaid, 0)
                const paidPct = totalDue > 0 ? totalPaid / totalDue : 0

                return (
                  <div key={call.id} className="rounded-xl border border-border bg-card p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-[13px] font-semibold text-foreground">Capital Call #{call.callNumber}</p>
                          <span className={cn('inline-flex items-center rounded border px-2 py-0.5 text-[9px] font-semibold uppercase', CALL_STATUS_STYLES[call.status])}>
                            {String(call.status ?? '').replace(/_/g, ' ')}
                          </span>
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-0.5">{call.purpose}</p>
                        <div className="flex gap-4 mt-1 text-[11px] text-muted-foreground">
                          <span>Issued: {new Date(call.callDate).toLocaleDateString()}</span>
                          <span>Due: {new Date(call.dueDate).toLocaleDateString()}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-[18px] font-semibold text-foreground tabular-nums">{fmtM(call.totalAmount)}</p>
                        <p className="text-[11px] text-muted-foreground">{fmtM(totalPaid)} received ({(paidPct * 100).toFixed(0)}%)</p>
                      </div>
                    </div>

                    {/* Progress bar */}
                    <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full transition-all"
                        style={{ width: `${Math.min(100, paidPct * 100)}%` }}
                      />
                    </div>

                    {/* Per-LP allocations */}
                    <div className="space-y-1">
                      {call.allocations.map((alloc) => (
                        <div key={alloc.id} className="flex items-center justify-between text-[11px]">
                          <span className="text-foreground">{alloc.lpEntity.name}</span>
                          <div className="flex items-center gap-3">
                            <span className="text-muted-foreground tabular-nums">{fmtPct(alloc.proRataShare)} → {fmtM(alloc.amountDue)}</span>
                            {alloc.status === 'PAID' ? (
                              <span className="flex items-center gap-1 text-emerald-400">
                                <CheckCircle2 size={10} /> Paid
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => {
                                  startTransition(async () => {
                                    try { await recordLPPayment(alloc.id, alloc.amountDue) }
                                    catch (err) { setActionError(err instanceof Error ? err.message : 'Failed to record payment.') }
                                  })
                                }}
                                className="h-5 px-2 rounded border border-border text-[9px] text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                              >
                                Mark Paid
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    {call.status === 'DRAFT' && (
                      <button
                        type="button"
                        onClick={() => {
                          startTransition(async () => {
                            try { await issueCapitalCall(call.id) }
                            catch (err) { setActionError(err instanceof Error ? err.message : 'Failed to issue capital call.') }
                          })
                        }}
                        className="h-7 px-3 rounded-md bg-primary text-primary-foreground text-[11px] font-medium hover:bg-primary/90 transition-colors"
                      >
                        Issue Capital Call Notice
                      </button>
                    )}

                    {call.wireInstructions && (
                      <div className="border-t border-border pt-3">
                        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">Wire Instructions</p>
                        <p className="text-[11px] text-foreground whitespace-pre-wrap">{call.wireInstructions}</p>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Distributions */}
      {tab === 'Distributions' && (
        <div className="space-y-3">
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="text-[11px] font-semibold text-foreground mb-2">Distribution Waterfall</p>
            <div className="flex items-center gap-2 flex-wrap text-[11px] text-muted-foreground">
              {[
                'Return of Capital',
                'Preferred Return (hurdle 8%)',
                'Carried Interest (20% GP)',
                'Residual (80% LP)',
              ].map((step, i) => (
                <div key={step} className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-secondary text-[9px] font-semibold flex items-center justify-center text-foreground">{i + 1}</span>
                  <span>{step}</span>
                  {i < 3 && <span className="text-muted-foreground/40">→</span>}
                </div>
              ))}
            </div>
          </div>

          {distributions.length === 0 ? (
            <EmptyState icon={DollarSign} title="No distributions" sub="Exit proceeds and return distributions will appear here." />
          ) : (
            <div className="space-y-4">
              {distributions.map((dist) => {
                const totalRC = dist.allocations.reduce((s, a) => s + a.returnOfCapital, 0)
                const totalPR = dist.allocations.reduce((s, a) => s + a.preferredReturn, 0)
                const totalCarry = dist.allocations.reduce((s, a) => s + a.carry, 0)

                return (
                  <div key={dist.id} className="rounded-xl border border-border bg-card p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-[13px] font-semibold text-foreground">{DIST_TYPE_LABELS[dist.type]}</p>
                          <span className="inline-flex items-center rounded border border-border bg-secondary/30 px-2 py-0.5 text-[9px] font-semibold uppercase text-muted-foreground">
                            {new Date(dist.distributionDate).toLocaleDateString()}
                          </span>
                        </div>
                        {dist.description && <p className="text-[11px] text-muted-foreground mt-0.5">{dist.description}</p>}
                        {dist.taxDocStatus && (
                          <div className="flex items-center gap-1 mt-1">
                            <span className="text-[10px] text-muted-foreground">Tax docs:</span>
                            <span className={cn('text-[10px] font-medium', dist.taxDocStatus === 'ISSUED' ? 'text-emerald-400' : 'text-amber-400')}>
                              {dist.taxDocStatus}
                            </span>
                          </div>
                        )}
                      </div>
                      <p className="text-[18px] font-semibold text-foreground tabular-nums">{fmtM(dist.totalAmount)}</p>
                    </div>

                    {/* Waterfall breakdown */}
                    <div className="grid grid-cols-3 gap-3 py-2 border-t border-b border-border">
                      {[
                        { label: 'Return of Capital', value: totalRC },
                        { label: 'Preferred Return', value: totalPR },
                        { label: 'Carried Interest', value: totalCarry },
                      ].map(({ label, value }) => (
                        <div key={label} className="text-center">
                          <p className="text-[10px] text-muted-foreground">{label}</p>
                          <p className="text-[13px] font-semibold text-foreground tabular-nums">{fmtM(value)}</p>
                        </div>
                      ))}
                    </div>

                    {/* Per-LP breakdown */}
                    <div className="space-y-1">
                      {dist.allocations.map((alloc) => (
                        <div key={alloc.id} className="flex items-center justify-between text-[11px]">
                          <span className="text-foreground">{alloc.lpEntity.name}</span>
                          <div className="flex items-center gap-3">
                            <span className="text-muted-foreground">{fmtPct(alloc.proRataShare)}</span>
                            <span className="text-foreground font-medium tabular-nums">{fmtM(alloc.netAmount)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* LPAC */}
      {tab === 'LPAC' && (
        <div className="space-y-3">
          <p className="text-[11px] text-muted-foreground">
            LP Advisory Committee reviews conflicts of interest, approves valuation methodology, and provides consent on material decisions per the LPA.
          </p>
          {lpacMeetings.length === 0 ? (
            <EmptyState icon={Calendar} title="No LPAC meetings" sub="LPAC meetings will appear here once scheduled." />
          ) : (
            <div className="space-y-4">
              {lpacMeetings.map((meeting) => (
                <div key={meeting.id} className="rounded-xl border border-border bg-card p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-[13px] font-semibold text-foreground">{LPAC_TYPE_LABELS[meeting.type]} Meeting</p>
                        <span className={cn(
                          'inline-flex items-center rounded border px-2 py-0.5 text-[9px] font-semibold uppercase',
                          meeting.status === 'HELD' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                            meeting.status === 'SCHEDULED' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                              'bg-secondary/50 text-muted-foreground border-border'
                        )}>
                          {meeting.status}
                        </span>
                        {meeting.quorumMet && (
                          <span className="inline-flex items-center rounded border border-emerald-500/20 bg-emerald-500/10 text-emerald-400 px-2 py-0.5 text-[9px] font-semibold uppercase">
                            QUORUM MET
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        {new Date(meeting.meetingDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                        {meeting.location && ` · ${meeting.location}`}
                      </p>
                    </div>
                    {meeting.status === 'SCHEDULED' && (
                      <button
                        type="button"
                        onClick={() => {
                          setActionError(null)
                          startTransition(async () => {
                            try {
                              await saveLPACMinutes(meeting.id, 'Minutes recorded.', true)
                            } catch {
                              setActionError('Failed to record minutes.')
                            }
                          })
                        }}
                        className="h-7 px-3 rounded-md border border-border text-[11px] text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                      >
                        Record Minutes
                      </button>
                    )}
                  </div>

                  {meeting.agenda && (
                    <div>
                      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">Agenda</p>
                      <p className="text-[11px] text-foreground">{meeting.agenda}</p>
                    </div>
                  )}

                  {/* Members */}
                  {meeting.members.length > 0 && (
                    <div>
                      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">Members</p>
                      <div className="flex gap-2 flex-wrap">
                        {meeting.members.map((m) => (
                          <span key={m.meetingId + m.lpEntityId} className={cn(
                            'inline-flex items-center rounded border px-2 py-0.5 text-[10px]',
                            m.attended ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400' : 'border-border text-muted-foreground bg-secondary/30'
                          )}>
                            {m.lpEntity.name}
                            {m.attended ? ' ✓' : ' (absent)'}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Resolutions */}
                  {meeting.resolutions.length > 0 && (
                    <div>
                      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">Resolutions</p>
                      <div className="space-y-1.5">
                        {meeting.resolutions.map((res) => (
                          <div key={res.id} className="flex items-start gap-2">
                            <span className={cn(
                              'inline-flex rounded border px-1.5 py-0.5 text-[9px] font-semibold uppercase flex-shrink-0 mt-px',
                              res.outcome === 'APPROVED' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                                res.outcome === 'REJECTED' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                                  'bg-secondary/50 text-muted-foreground border-border'
                            )}>
                              {res.outcome}
                            </span>
                            <div>
                              <p className="text-[11px] font-medium text-foreground">{res.title}</p>
                              {res.description && <p className="text-[10px] text-muted-foreground">{res.description}</p>}
                              {(res.votesFor > 0 || res.votesAgainst > 0) && (
                                <p className="text-[10px] text-muted-foreground">{res.votesFor} for · {res.votesAgainst} against</p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {meeting.minutesContent && (
                    <div className="border-t border-border pt-3">
                      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">Minutes</p>
                      <p className="text-[11px] text-foreground whitespace-pre-wrap line-clamp-4">{meeting.minutesContent}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function EmptyState({ icon: Icon, title, sub }: { icon: React.ElementType; title: string; sub: string }) {
  return (
    <div className="rounded-xl border border-border bg-card flex flex-col items-center justify-center py-12 text-center">
      <Icon size={24} className="text-muted-foreground mb-2" />
      <p className="text-[13px] font-medium text-foreground">{title}</p>
      <p className="text-[11px] text-muted-foreground mt-1">{sub}</p>
    </div>
  )
}
