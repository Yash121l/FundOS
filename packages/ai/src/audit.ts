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
  // In production, this writes to the AuditLog table via the database package.
  // Implemented in Phase 6 when workers are active.
}
