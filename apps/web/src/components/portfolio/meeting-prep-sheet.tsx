'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { X, Printer, Loader2, MessageSquare, AlertTriangle, CheckSquare, HelpCircle, Lightbulb } from 'lucide-react'
import { generateMeetingPrep } from '@/lib/meeting-prep-actions'
import type { MeetingBrief } from '@fundos/types'

const FOCUSABLE = 'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])'

interface MeetingPrepSheetProps {
  companyId: string
  companyName: string
  onClose: () => void
}

function InlineMarkdown({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g)
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return <strong key={i} className="font-semibold text-foreground">{part.slice(2, -2)}</strong>
        }
        return <span key={i}>{part}</span>
      })}
    </>
  )
}

function MarkdownBlock({ text }: { text: string }) {
  const safe = typeof text === 'string' ? text : Array.isArray(text) ? (text as string[]).join('\n') : ''
  const lines = safe.split('\n')
  return (
    <div className="space-y-1">
      {lines.map((line, i) => {
        if (typeof line === 'string' && (line.startsWith('- ') || line.startsWith('* '))) {
          return (
            <div key={i} className="flex gap-2">
              <span className="text-muted-foreground flex-shrink-0 mt-0.5">·</span>
              <span><InlineMarkdown text={line.slice(2)} /></span>
            </div>
          )
        }
        if (line === '') return <div key={i} className="h-1.5" />
        return <p key={i}><InlineMarkdown text={line} /></p>
      })}
    </div>
  )
}

function BriefSection({ icon: Icon, title, children }: {
  icon: React.ComponentType<{ size?: number; className?: string }>
  title: string
  children: React.ReactNode
}) {
  return (
    <div className="border-b border-border last:border-0 py-5 first:pt-0">
      <div className="flex items-center gap-2 mb-2">
        <Icon size={13} className="text-muted-foreground" />
        <h3 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{title}</h3>
      </div>
      <div className="text-[13px] text-foreground leading-relaxed">{children}</div>
    </div>
  )
}

function BulletList({ items }: { items: string[] }) {
  return (
    <ul className="space-y-1.5">
      {items.map((item, i) => (
        <li key={i} className="flex gap-2">
          <span className="text-muted-foreground mt-0.5 flex-shrink-0">·</span>
          <span><InlineMarkdown text={item} /></span>
        </li>
      ))}
    </ul>
  )
}

export function MeetingPrepSheet({ companyId, companyName, onClose }: MeetingPrepSheetProps) {
  const [brief, setBrief] = useState<MeetingBrief | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [refetchError, setRefetchError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const hasBriefRef = useRef(false)
  const sheetRef = useRef<HTMLDivElement>(null)

  const fetchBrief = useCallback(async () => {
    setError(null)
    setRefetchError(null)
    setIsLoading(true)
    try {
      const result = await generateMeetingPrep(companyId)
      setBrief(result)
      hasBriefRef.current = true
    } catch (err) {
      console.error('[meeting-prep] Failed to fetch brief:', err)
      if (hasBriefRef.current) {
        setRefetchError('Refresh failed. Showing previous brief.')
      } else {
        setError('Failed to generate brief. Please try again.')
      }
    } finally {
      setIsLoading(false)
    }
  }, [companyId])

  useEffect(() => {
    void fetchBrief()
  }, [fetchBrief])

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  useEffect(() => {
    const sheet = sheetRef.current
    if (!sheet) return

    function trapFocus(e: KeyboardEvent) {
      if (e.key !== 'Tab') return
      const focusable = Array.from(sheet!.querySelectorAll<HTMLElement>(FOCUSABLE))
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (e.shiftKey) {
        if (document.activeElement === first) { e.preventDefault(); last?.focus() }
      } else {
        if (document.activeElement === last) { e.preventDefault(); first?.focus() }
      }
    }

    const focusable = Array.from(sheet.querySelectorAll<HTMLElement>(FOCUSABLE))
    focusable[0]?.focus()

    document.addEventListener('keydown', trapFocus)
    return () => document.removeEventListener('keydown', trapFocus)
  }, [brief, error, isLoading])

  return (
    <>
      {/* Backdrop — hidden during print */}
      <div
        className="print-backdrop fixed inset-0 bg-background/60 backdrop-blur-sm z-40"
        onClick={onClose}
      />

      {/* Sheet */}
      <div
        ref={sheetRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="meeting-brief-title"
        className="print-sheet fixed right-0 top-0 h-full w-[calc(100%-32px)] sm:w-full max-w-[480px] bg-card border-l border-border z-50 flex flex-col shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border flex-shrink-0 print:hidden">
          <div>
            <p className="text-[11px] text-muted-foreground uppercase tracking-wide font-medium">Meeting Brief</p>
            <h2 id="meeting-brief-title" className="text-[15px] font-semibold">{companyName}</h2>
          </div>
          <div className="flex items-center gap-2">
            {brief && (
              <button
                type="button"
                onClick={() => {
                  try { window.print() } catch (err) { console.error('[meeting-prep] Print failed:', err) }
                }}
                className="h-7 px-3 rounded-md border border-border bg-secondary text-[12px] text-muted-foreground hover:text-foreground flex items-center gap-1.5 transition-colors"
              >
                <Printer size={12} />
                Print
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="h-7 w-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
            >
              <X size={15} />
            </button>
          </div>
        </div>

        {/* Print-only header */}
        <div className="hidden print:block px-8 py-6 border-b border-border">
          <p className="text-[11px] text-muted-foreground uppercase tracking-wide">Meeting Brief — SignalOS</p>
          <h1 className="text-xl font-semibold mt-0.5">{companyName}</h1>
          <p className="text-[12px] text-muted-foreground mt-1">
            Generated {brief ? new Date(brief.generatedAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : ''}
          </p>
        </div>

        {refetchError && (
          <div className="mx-5 mt-3 rounded-md bg-destructive/10 border border-destructive/20 px-3 py-2 print:hidden">
            <p className="text-[12px] text-destructive">{refetchError}</p>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 print:px-8 print:overflow-visible">
          {isLoading && !brief && (
            <div className="flex flex-col items-center justify-center h-full gap-3">
              <Loader2 size={20} className="animate-spin text-muted-foreground" />
              <p className="text-[13px] text-muted-foreground">Generating brief…</p>
            </div>
          )}

          {error && !brief && (
            <div className="flex flex-col items-center justify-center h-full gap-2 text-center">
              <p className="text-[13px] text-foreground">{error}</p>
              <button
                type="button"
                onClick={() => void fetchBrief()}
                className="text-[12px] text-primary hover:underline"
              >
                Try again
              </button>
            </div>
          )}

          {brief && (
            <div className="py-5">
              <BriefSection icon={MessageSquare} title="Health Trajectory">
                <MarkdownBlock text={brief.healthTrajectory} />
              </BriefSection>

              <BriefSection icon={AlertTriangle} title="Open Risks">
                <MarkdownBlock text={brief.openRisksSection} />
              </BriefSection>

              <BriefSection icon={CheckSquare} title="Pending Actions from Fund Team">
                <MarkdownBlock text={brief.pendingActionsSection} />
              </BriefSection>

              <BriefSection icon={Lightbulb} title="Discussion Topics">
                <BulletList items={brief.discussionTopics} />
              </BriefSection>

              <BriefSection icon={HelpCircle} title="Questions to Ask">
                <BulletList items={brief.questionsToAsk} />
              </BriefSection>

              <p className="text-[11px] text-muted-foreground/50 mt-4 print:hidden">
                Generated {new Date(brief.generatedAt).toLocaleString()}
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
