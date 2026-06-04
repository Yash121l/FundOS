'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { submitFounderNews, type FounderNewsFormData } from '@/lib/founder-actions'
import type { NewsSubmissionType } from '@fundos/types'

const NEWS_TYPES: { value: NewsSubmissionType; label: string; description: string }[] = [
  { value: 'CUSTOMER_WIN', label: 'Customer Win', description: 'New contract, enterprise deal, or retention story' },
  { value: 'PARTNERSHIP', label: 'Partnership', description: 'Strategic partner, integration, or distribution deal' },
  { value: 'PRODUCT_LAUNCH', label: 'Product Launch', description: 'New feature, major release, or product milestone' },
  { value: 'HIRING_UPDATE', label: 'Hiring Update', description: 'Key hire, exec addition, or team milestone' },
  { value: 'PRESS_MENTION', label: 'Press Mention', description: 'Coverage, award, or industry recognition' },
  { value: 'OTHER', label: 'Other', description: 'Anything else worth sharing with investors' },
]

export function FounderNewsForm() {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [submitted, setSubmitted] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const [type, setType] = useState<NewsSubmissionType>('CUSTOMER_WIN')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [impact, setImpact] = useState('')
  const [url, setUrl] = useState('')

  function validate(): Record<string, string> {
    const e: Record<string, string> = {}
    if (!title.trim()) e.title = 'Title is required'
    if (!description.trim()) e.description = 'Description is required'
    if (url && !/^https?:\/\//.test(url)) e.url = 'Enter a valid URL starting with https://'
    return e
  }

  async function submit() {
    const e = validate()
    if (Object.keys(e).length) { setErrors(e); return }
    setErrors({})

    const data: FounderNewsFormData = { type, title, description, impact, url }
    startTransition(async () => {
      const result = await submitFounderNews(data)
      if (result.success) setSubmitted(true)
    })
  }

  if (submitted) {
    return (
      <div className="rounded-lg border border-border bg-card p-8 text-center">
        <div className="h-10 w-10 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto mb-4">
          <span className="text-emerald-400 text-lg">✓</span>
        </div>
        <h2 className="text-lg font-semibold mb-2">News shared</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Your investors have been updated. Thanks for keeping them in the loop.
        </p>
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => { setSubmitted(false); setTitle(''); setDescription(''); setImpact(''); setUrl('') }}
            className="h-8 px-4 rounded-md text-[12px] border border-border hover:bg-secondary/50 transition-colors"
          >
            Share another
          </button>
          <button
            onClick={() => router.push('/founder/dashboard')}
            className="h-8 px-4 rounded-md text-[12px] font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-border bg-card p-6 space-y-4">
      {/* Type selector */}
      <div>
        <label className="block text-[12px] font-medium text-foreground mb-2">Type of news</label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {NEWS_TYPES.map((t) => (
            <button
              key={t.value}
              onClick={() => setType(t.value)}
              className={`text-left rounded-md border p-2.5 transition-colors ${
                type === t.value
                  ? 'border-primary bg-primary/5 text-foreground'
                  : 'border-border hover:border-border/70 hover:bg-secondary/30 text-muted-foreground'
              }`}
            >
              <p className="text-[12px] font-medium">{t.label}</p>
              <p className="text-[10px] mt-0.5 leading-snug">{t.description}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Title */}
      <div>
        <label className="block text-[12px] font-medium text-foreground mb-1">
          Headline <span className="text-red-400">*</span>
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="input"
          placeholder="e.g. Signed 3-year enterprise deal with Acme Corp"
          maxLength={250}
        />
        {errors.title && <p className="text-[11px] text-red-400 mt-1">{errors.title}</p>}
      </div>

      {/* Description */}
      <div>
        <label className="block text-[12px] font-medium text-foreground mb-1">
          Details <span className="text-red-400">*</span>
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="input min-h-[100px] resize-none"
          placeholder="Context, background, and what this means for the business…"
          maxLength={2000}
        />
        {errors.description && <p className="text-[11px] text-red-400 mt-1">{errors.description}</p>}
      </div>

      {/* Business impact */}
      <div>
        <label className="block text-[12px] font-medium text-foreground mb-1">
          Business impact <span className="text-muted-foreground font-normal">(optional)</span>
        </label>
        <textarea
          value={impact}
          onChange={(e) => setImpact(e.target.value)}
          className="input min-h-[70px] resize-none"
          placeholder="Expected ARR impact, pipeline value, strategic significance…"
          maxLength={500}
        />
      </div>

      {/* URL */}
      <div>
        <label className="block text-[12px] font-medium text-foreground mb-1">
          Link <span className="text-muted-foreground font-normal">(optional)</span>
        </label>
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          className="input"
          placeholder="https://techcrunch.com/your-article"
        />
        {errors.url && <p className="text-[11px] text-red-400 mt-1">{errors.url}</p>}
      </div>

      <button
        onClick={submit}
        className="w-full h-9 rounded-md text-[13px] font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
      >
        Share with Investors
      </button>
    </div>
  )
}
