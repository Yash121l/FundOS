'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Send, Sparkles, TrendingDown, DollarSign, Users, BarChart3, Plus, MessageSquare, Trash2, PanelLeft } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  streaming?: boolean
}

interface ChatSession {
  id: string
  title: string
  messages: Message[]
  createdAt: number
  updatedAt: number
}

const STORAGE_KEY = 'signalos-chat-sessions'
const MAX_SESSIONS = 30

function loadSessions(): ChatSession[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as ChatSession[]) : []
  } catch {
    return []
  }
}

function persistSession(session: ChatSession) {
  try {
    const all = loadSessions()
    const idx = all.findIndex((s) => s.id === session.id)
    if (idx >= 0) all[idx] = session
    else all.unshift(session)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all.slice(0, MAX_SESSIONS)))
  } catch {
    // ignore storage errors
  }
}

function deleteSession(id: string) {
  try {
    const all = loadSessions().filter((s) => s.id !== id)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all))
  } catch {
    // ignore
  }
}

function makeSessionTitle(firstUserMessage: string): string {
  return firstUserMessage.length > 40 ? firstUserMessage.slice(0, 40) + '…' : firstUserMessage
}

const SUGGESTED_QUESTIONS = [
  { icon: TrendingDown, text: 'Which companies have runway under 9 months?' },
  { icon: DollarSign, text: "What are the common themes in this quarter's founder updates?" },
  { icon: BarChart3, text: "Give me an overview of the portfolio's financial health" },
  { icon: Users, text: 'Which companies are at risk and why?' },
]

function InlineMarkdown({ text }: { text: string }) {
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
                <span><InlineMarkdown text={line.slice(2)} /></span>
              </div>
            )
          }
          if (line === '---') {
            return <hr key={i} className="my-2 border-border" />
          }
          if (line === '') {
            return <div key={i} className="h-1.5" />
          }
          return <p key={i} className="my-0.5"><InlineMarkdown text={line} /></p>
        })}
        {message.streaming && (
          <span className="inline-block w-1 h-3.5 bg-muted-foreground/50 ml-0.5 animate-pulse rounded-sm" />
        )}
      </div>
    </div>
  )
}

function formatRelativeTime(ts: number): string {
  const diff = Date.now() - ts
  const mins = Math.floor(diff / 60_000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  return `${days}d ago`
}

export default function AskPage() {
  const [sessions, setSessions] = useState<ChatSession[]>([])
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [deleteHover, setDeleteHover] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  // Load sessions from localStorage on mount
  useEffect(() => {
    setSessions(loadSessions())
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const startNewChat = useCallback(() => {
    setActiveSessionId(null)
    setMessages([])
    setInput('')
    inputRef.current?.focus()
  }, [])

  function loadSession(session: ChatSession) {
    setActiveSessionId(session.id)
    setMessages(session.messages)
    setInput('')
    inputRef.current?.focus()
  }

  function handleDeleteSession(e: React.MouseEvent, id: string) {
    e.stopPropagation()
    deleteSession(id)
    const updated = loadSessions()
    setSessions(updated)
    if (activeSessionId === id) {
      setActiveSessionId(null)
      setMessages([])
    }
  }

  async function sendQuestion(question: string) {
    if (!question.trim() || isStreaming) return

    const userMsg: Message = { id: `u-${Date.now()}`, role: 'user', content: question.trim() }
    const assistantId = `a-${Date.now()}`
    const assistantMsg: Message = { id: assistantId, role: 'assistant', content: '', streaming: true }

    const nextMessages = [...messages, userMsg, assistantMsg]
    setMessages(nextMessages)
    setInput('')
    setIsStreaming(true)

    // Create or update session
    let sessionId = activeSessionId
    if (!sessionId) {
      sessionId = `session-${Date.now()}`
      setActiveSessionId(sessionId)
    }
    const sessionTitle = activeSessionId
      ? (sessions.find((s) => s.id === sessionId)?.title ?? makeSessionTitle(question.trim()))
      : makeSessionTitle(question.trim())

    let fullText = ''

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
      fullText = 'Something went wrong. Please try again.'
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId
            ? { ...m, content: fullText, streaming: false }
            : m
        )
      )
    } finally {
      setIsStreaming(false)
      inputRef.current?.focus()
    }

    // Persist the final session (with non-streaming messages)
    const finalMessages: Message[] = [
      ...messages.filter((m) => !m.streaming),
      { ...userMsg },
      { id: assistantId, role: 'assistant', content: fullText, streaming: false },
    ]
    const now = Date.now()
    const updatedSession: ChatSession = {
      id: sessionId,
      title: sessionTitle,
      messages: finalMessages,
      createdAt: sessions.find((s) => s.id === sessionId)?.createdAt ?? now,
      updatedAt: now,
    }
    persistSession(updatedSession)
    setSessions(loadSessions())
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      void sendQuestion(input)
    }
  }

  const showSuggestions = messages.length === 0

  return (
    <div className="flex h-[calc(100dvh-56px)]">
      {/* Chat History Sidebar */}
      <div
        className={cn(
          'flex-shrink-0 flex flex-col border-r border-border bg-card transition-all duration-200 overflow-hidden',
          sidebarOpen ? 'w-[220px]' : 'w-0'
        )}
      >
        {sidebarOpen && (
          <>
            <div className="flex items-center justify-between px-3 pt-3 pb-2 flex-shrink-0">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Chats</span>
              <button
                type="button"
                onClick={startNewChat}
                title="New chat"
                className="h-6 w-6 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
              >
                <Plus size={14} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-2 pb-3 space-y-0.5">
              {sessions.length === 0 && (
                <p className="text-[11px] text-muted-foreground/50 px-2 py-4 text-center leading-relaxed">
                  Your conversations will appear here
                </p>
              )}
              {sessions.map((session) => (
                <div
                  key={session.id}
                  className={cn(
                    'group relative rounded-lg px-2.5 py-2 cursor-pointer transition-colors',
                    activeSessionId === session.id
                      ? 'bg-primary/10 text-foreground'
                      : 'text-muted-foreground hover:bg-secondary/60 hover:text-foreground'
                  )}
                  onClick={() => loadSession(session)}
                  onMouseEnter={() => setDeleteHover(session.id)}
                  onMouseLeave={() => setDeleteHover(null)}
                >
                  <div className="flex items-start gap-1.5">
                    <MessageSquare size={12} className="flex-shrink-0 mt-0.5 opacity-60" />
                    <div className="min-w-0 flex-1">
                      <p className="text-[12px] font-medium leading-snug truncate pr-5">{session.title}</p>
                      <p className="text-[10px] opacity-50 mt-0.5">{formatRelativeTime(session.updatedAt)}</p>
                    </div>
                  </div>
                  {deleteHover === session.id && (
                    <button
                      type="button"
                      onClick={(e) => handleDeleteSession(e, session.id)}
                      title="Delete chat"
                      className="absolute right-1.5 top-1/2 -translate-y-1/2 h-5 w-5 rounded flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                    >
                      <Trash2 size={11} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Main Chat Area */}
      <div className="flex flex-col flex-1 min-w-0">
        {/* Header */}
        <div className="flex-shrink-0 px-5 py-4 border-b border-border flex items-center gap-3">
          <button
            type="button"
            onClick={() => setSidebarOpen((v) => !v)}
            title="Toggle chat history"
            className="h-7 w-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors flex-shrink-0"
          >
            <PanelLeft size={15} />
          </button>
          <div className="flex items-center gap-2 min-w-0">
            <Sparkles size={15} className="text-primary flex-shrink-0" />
            <h1 className="text-[15px] font-semibold truncate">Ask SignalOS</h1>
          </div>
          <div className="ml-auto">
            <button
              type="button"
              onClick={startNewChat}
              className="h-7 px-2.5 rounded-md border border-border text-[11px] text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors flex items-center gap-1.5"
            >
              <Plus size={12} />
              New chat
            </button>
          </div>
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
    </div>
  )
}
