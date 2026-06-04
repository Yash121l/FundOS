import type { AIAuditEntry } from '@fundos/types'

export async function writeAIAuditLog(entry: AIAuditEntry): Promise<void> {
  if (process.env.NODE_ENV === 'development') {
    console.log('[AI Audit]', {
      service: entry.service,
      model: entry.model,
      tokens: entry.promptTokens + entry.completionTokens,
      durationMs: entry.durationMs,
      entityType: entry.entityType,
      entityId: entry.entityId,
    })
  }

  try {
    // Lazy import to avoid bundling the DB client in environments that don't need it
    const { db } = await import('@fundos/database')
    await db.auditLog.create({
      data: {
        action: 'AI_ANALYSIS',
        entityType: entry.entityType,
        entityId: entry.entityId,
        metadata: JSON.parse(JSON.stringify({
          service: entry.service,
          model: entry.model,
          promptTokens: entry.promptTokens,
          completionTokens: entry.completionTokens,
          durationMs: entry.durationMs,
          input: entry.input,
          output: entry.output,
        })),
      },
    })
  } catch (err) {
    // Audit log failure must never crash the main flow — log to stderr for observability
    process.stderr.write(`[AI Audit] write failed for ${entry.entityType}:${entry.entityId} — ${err}\n`)
  }
}
