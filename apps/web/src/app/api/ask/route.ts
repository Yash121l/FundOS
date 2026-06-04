import { auth } from '@clerk/nextjs/server'
import { PortfolioQAAgent } from '@fundos/ai'
import { getAskContext } from '@/lib/ask-context'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const STREAM_TIMEOUT_MS = 30_000

export async function POST(req: Request) {
  // Belt-and-suspenders auth guard — middleware handles the edge, this catches cache/cold-start slippage
  if (process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) {
    const { userId } = await auth()
    if (!userId) return new Response('Unauthorized', { status: 401 })
  }

  let question: string
  try {
    const body = await req.json() as { question?: string }
    question = (body.question ?? '').trim()
  } catch (err) {
    console.error('[ask] Invalid request body:', err)
    return new Response('Invalid request body', { status: 400 })
  }

  if (!question) return new Response('Question is required', { status: 400 })
  if (question.length > 2000) return new Response('Question too long', { status: 400 })

  const context = await getAskContext()
  const agent = new PortfolioQAAgent()

  let agentStream: ReadableStream<Uint8Array>
  try {
    agentStream = await agent.stream(question, context)
  } catch (err) {
    console.error('[ask] Agent streaming failed:', err)
    return new Response('Failed to generate response', { status: 500 })
  }

  const abort = new AbortController()
  const timeout = setTimeout(() => abort.abort(), STREAM_TIMEOUT_MS)

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const reader = agentStream.getReader()

      // Named handler so we can remove it after the stream completes
      function onAbort() {
        const timeoutMsg = new TextEncoder().encode('\n\n[Response timeout — please try again]')
        try { controller.enqueue(timeoutMsg) } catch { /* stream may already be locked */ }
        reader.cancel().catch(() => undefined)
        controller.close()
      }
      abort.signal.addEventListener('abort', onAbort, { once: true })

      try {
        let done = false
        while (!done) {
          const result = await reader.read()
          done = result.done
          if (!done && result.value) controller.enqueue(result.value)
        }
      } finally {
        abort.signal.removeEventListener('abort', onAbort)
        clearTimeout(timeout)
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'X-Content-Type-Options': 'nosniff',
      'Cache-Control': 'no-store',
    },
  })
}
