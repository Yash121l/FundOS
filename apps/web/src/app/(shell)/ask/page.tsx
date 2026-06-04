'use client'

import { useState, useRef, useEffect } from 'react'
import { Send, Sparkles, TrendingDown, DollarSign, Users, BarChart3 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  streaming?: boolean
}

const SUGGESTED_QUESTIONS = [
  { icon: TrendingDown, text: 'Which companies have runway under 9 months?' },
  { icon: DollarSign, text: "What are the common themes in this quarter's founder updates?" },
  { icon: BarChart3, text: "Give me an overview of the portfolio's financial health" },
  { icon: Users, text: 'Which companies are at risk and why?' },
]

function MarkdownLine({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]*?\*\*|\[[^\]]*?\])/g)
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return <strong key={i}>{part.slice(2, -2)}</strong>
        }
        if (part.startsWith('[') && part.endsWith(']')) {
          return <span key={i} className="text-primary font-medium">{part.slice(1, -1)}</span>
        }
        return <span key={i}>{part}</span>
      })}
    </>
  )
}

function MessageBubble({ message }: { message: Message }) {
  if (message.role === 'user') {
    return (
      <div className="flex justify-end">
        <div className="max-w-[70%] rounded-2xl rounded-tr-sm bg-primary px-4 py-2.5 text-[13px] text-primary-foreground">
          {message.content}
        </div>
      </div>
    )
  }

  const lines = message.content.split('\n')

  return (
    <div className="flex gap-2.5 max-w-[85%]">
      <div className="flex-shrink-0 mt-0.5 h-6 w-6 rounded-full bg-primary/15 flex items-center justify-center">
        <Sparkles size={12} className="text-primary" />
      </div>
      <div className="rounded-2xl rounded-tl-sm bg-card border border-border px-4 py-3 text-[13px] text-foreground leading-relaxed">
        {lines.map((line, i) => {
          if (line.startsWith('## ')) {
            return <p key={i} className="font-semibold text-[14px] mt-3 mb-1 first:mt-0">{line.slice(3)}</p>
          }
          if (line.startsWith('### ')) {
            return <p key={i} className="font-medium mt-2 mb-0.5 first:mt-0">{line.slice(4)}</p>
          }
          if (line.startsWith('- ') || line.startsWith('* ')) {
            return (
              <div key={i} className="flex gap-1.5 my-0.5">
                <span className="text-muted-foreground mt-0.5">·</span>
                <span><MarkdownLine text={line.slice(2)} /></span>
              </div>
            )
          }
          if (line === '---') {
            return <hr key={i} className="my-2 border-border" />
          }
          if (line === '') {
            return <div key={i} className="h-1.5" />
          }
          return <p key={i} className="my-0.5"><MarkdownLine text={line} /></p>
        })}
        {message.streaming && (
          <span className="inline-block w-1 h-3.5 bg-muted-foreground/50 ml-0.5 animate-pulse rounded-sm" />
        )}
      </div>
    </div>
  )
}

export default function AskPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function sendQuestion(question: string) {
    if (!question.trim() || isStreaming) return

    const userMsg: Message = { id: `u-${Date.now()}`, role: 'user', content: question.trim() }
    const assistantId = `a-${Date.now()}`
    const assistantMsg: Message = { id: assistantId, role: 'assistant', content: '', streaming: true }

    setMessages((prev) => [...prev, userMsg, assistantMsg])
    setInput('')
    setIsStreaming(true)

    try {
      const response = await fetch('/api/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: question.trim() }),
      })

      if (!response.ok || !response.body) {
        throw new Error('Request failed')
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let fullText = ''
      let streamDone = false

      while (!streamDone) {
        const { done, value } = await reader.read()
        streamDone = done
        if (done) break
        const chunk = decoder.decode(value, { stream: true })
        fullText += chunk
        const captured = fullText
        setMessages((prev) =>
          prev.map((m) => m.id === assistantId ? { ...m, content: captured, streaming: true } : m)
        )
      }

      setMessages((prev) =>
        prev.map((m) => m.id === assistantId ? { ...m, content: fullText, streaming: false } : m)
      )
    } catch (err) {
      console.error('[ask] Failed to stream response:', err)
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId
            ? { ...m, content: 'Something went wrong. Please try again.', streaming: false }
            : m
        )
      )
    } finally {
      setIsStreaming(false)
      inputRef.current?.focus()
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      void sendQuestion(input)
    }
  }

  const showSuggestions = messages.length === 0

  return (
    <div className="flex flex-col h-[calc(100dvh-56px)]">
      {/* Header */}
      <div className="flex-shrink-0 px-5 py-4 border-b border-border">
        <div className="flex items-center gap-2">
          <Sparkles size={16} className="text-primary" />
          <h1 className="text-[15px] font-semibold">Ask SignalOS</h1>
        </div>
        <p className="text-[12px] text-muted-foreground mt-0.5">
          Ask questions about your portfolio in plain English
        </p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
        {showSuggestions && (
          <div className="flex flex-col items-center py-10 text-center">
            <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
              <Sparkles size={22} className="text-primary" />
            </div>
            <h2 className="text-[15px] font-medium text-foreground mb-1">Portfolio Intelligence</h2>
            <p className="text-[12px] text-muted-foreground mb-6 max-w-[300px]">
              Ask anything about your portfolio — companies, metrics, trends, or risks.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-lg">
              {SUGGESTED_QUESTIONS.map(({ icon: Icon, text }) => (
                <button
                  type="button"
                  key={text}
                  onClick={() => { void sendQuestion(text) }}
                  className="flex items-start gap-2.5 rounded-xl border border-border bg-card p-3 text-left hover:bg-secondary/50 transition-colors"
                >
                  <Icon size={14} className="text-muted-foreground flex-shrink-0 mt-0.5" />
                  <span className="text-[12px] text-foreground leading-snug">{text}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} />
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="flex-shrink-0 px-5 py-3 border-t border-border">
        <div className="flex items-end gap-2 rounded-xl border border-border bg-card px-3 py-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about your portfolio…"
            aria-label="Ask about your portfolio"
            rows={1}
            disabled={isStreaming}
            className="flex-1 resize-none bg-transparent text-[13px] text-foreground placeholder:text-muted-foreground/50 outline-none leading-relaxed max-h-32 py-0.5 disabled:opacity-50"
            style={{ minHeight: '22px' }}
          />
          <button
            type="button"
            onClick={() => { void sendQuestion(input) }}
            disabled={!input.trim() || isStreaming}
            className={cn(
              'flex-shrink-0 h-7 w-7 rounded-lg flex items-center justify-center transition-colors',
              input.trim() && !isStreaming
                ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                : 'bg-secondary text-muted-foreground'
            )}
          >
            <Send size={13} />
          </button>
        </div>
        <p className="text-[10px] text-muted-foreground/40 text-center mt-1.5">
          Enter to send · Shift+Enter for new line
        </p>
      </div>
    </div>
  )
}
