'use client'

import { useState, useTransition } from 'react'
import { updateReportSection } from '@/lib/lp-report-actions'
import { cn } from '@/lib/utils'
import type { ReportSection } from '@/lib/lp-reports'

interface ReportSectionProps {
  section: ReportSection
  reportId: string
}

// Minimal markdown → HTML renderer (bold, headers, bullets, tables, blockquotes)
function renderMarkdown(md: string): string {
  return md
    .replace(/^## (.+)$/gm, '<h3 class="text-[13px] font-semibold text-foreground mt-4 mb-1.5">$1</h3>')
    .replace(/^### (.+)$/gm, '<h4 class="text-[12px] font-semibold text-foreground mt-3 mb-1">$1</h4>')
    .replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold text-foreground">$1</strong>')
    .replace(/^> (.+)$/gm, '<blockquote class="border-l-2 border-primary/40 pl-3 text-muted-foreground italic my-2">$1</blockquote>')
    .replace(/^\| (.+) \|$/gm, (line) => {
      const cells = line.split('|').filter(Boolean).map((c) => c.trim())
      if (cells.every((c) => /^[-:]+$/.test(c))) return '' // separator row
      const tag = line.includes('---') ? 'th' : 'td'
      return `<tr>${cells.map((c) => `<${tag} class="px-3 py-1.5 text-[12px] border border-border/50">${c}</${tag}>`).join('')}</tr>`
    })
    .replace(/(<tr>[\s\S]*?<\/tr>(\n|$))+/g, (match) => `<table class="w-full border-collapse border border-border/50 rounded-md overflow-hidden my-3 text-left">${match}</table>`)
    .replace(/^- (.+)$/gm, '<li class="text-[13px] text-foreground/90 ml-4 list-disc">$1</li>')
    .replace(/(<li[\s\S]*?<\/li>(\n|$))+/g, (match) => `<ul class="space-y-0.5 my-2">${match}</ul>`)
    .replace(/\n\n/g, '<br class="my-2" />')
}

export function ReportSectionCard({ section, reportId }: ReportSectionProps) {
  const [editing, setEditing] = useState(false)
  const [content, setContent] = useState(section.content)
  const [saved, setSaved] = useState(false)
  const [, startTransition] = useTransition()

  function handleSave() {
    startTransition(async () => {
      await updateReportSection(section.id, content, reportId)
      setSaved(true)
      setEditing(false)
      setTimeout(() => setSaved(false), 2000)
    })
  }

  return (
    <div className="rounded-xl border border-border bg-card print:border-none print:rounded-none print:bg-white print:break-inside-avoid">
      <div className="flex items-center justify-between px-5 py-3 border-b border-border print:border-b print:border-border/30">
        <div className="flex items-center gap-2">
          <h2 className="text-[14px] font-semibold text-foreground">{section.title}</h2>
          {!section.aiGenerated && (
            <span className="text-[10px] font-medium text-blue-400 bg-blue-500/10 border border-blue-500/20 rounded px-1.5 py-0.5">Edited</span>
          )}
        </div>
        <div className="flex items-center gap-2 print:hidden">
          {saved && <span className="text-[11px] text-emerald-400">✓ Saved</span>}
          {editing ? (
            <>
              <button onClick={handleSave} className="h-7 px-3 rounded-md bg-primary text-primary-foreground text-[11px] font-medium hover:bg-primary/90 transition-colors">Save</button>
              <button onClick={() => { setEditing(false); setContent(section.content) }} className="h-7 px-3 rounded-md border border-border text-[11px] text-muted-foreground hover:bg-accent transition-colors">Cancel</button>
            </>
          ) : (
            <button onClick={() => setEditing(true)} className="h-7 px-3 rounded-md border border-border text-[11px] text-muted-foreground hover:bg-accent hover:text-foreground transition-colors">Edit</button>
          )}
        </div>
      </div>

      <div className="px-5 py-4">
        {editing ? (
          <textarea
            autoFocus
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className={cn(
              'w-full min-h-[200px] rounded-lg border border-border bg-secondary/30 p-3',
              'text-[13px] text-foreground font-mono leading-relaxed resize-y',
              'focus:outline-none focus:ring-1 focus:ring-ring'
            )}
          />
        ) : (
          <div
            className="prose-sm text-[13px] text-foreground/90 leading-relaxed space-y-1"
            dangerouslySetInnerHTML={{ __html: renderMarkdown(content) }}
          />
        )}
      </div>
    </div>
  )
}
