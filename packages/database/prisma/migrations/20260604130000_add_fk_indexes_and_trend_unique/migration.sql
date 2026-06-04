-- AddIndex: missing foreign-key indexes on FounderUpdate, Task, LPReport
CREATE INDEX "companies_name_idx" ON "companies"("name");
CREATE INDEX "founder_updates_submittedById_idx" ON "founder_updates"("submittedById");
CREATE INDEX "founder_updates_reviewedById_idx" ON "founder_updates"("reviewedById");
CREATE INDEX "tasks_createdById_idx" ON "tasks"("createdById");
CREATE INDEX "lp_reports_generatedById_idx" ON "lp_reports"("generatedById");

-- Ensure system-authored workflow records can satisfy user foreign keys.
INSERT INTO "users" ("id", "clerkId", "email", "name", "role", "createdAt", "updatedAt")
VALUES ('SYSTEM', 'system', 'system@fundos.local', 'System', 'PORTFOLIO_OPS', NOW(), NOW())
ON CONFLICT ("id") DO NOTHING;

-- AddForeignKey: enforce referential integrity for user reference fields
ALTER TABLE "founder_updates"
  ADD CONSTRAINT "founder_updates_submittedById_fkey"
  FOREIGN KEY ("submittedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "founder_updates"
  ADD CONSTRAINT "founder_updates_reviewedById_fkey"
  FOREIGN KEY ("reviewedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "tasks"
  ADD CONSTRAINT "tasks_createdById_fkey"
  FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "lp_reports"
  ADD CONSTRAINT "lp_reports_generatedById_fkey"
  FOREIGN KEY ("generatedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddUniqueIndex: prevent duplicate active trend findings for the same title + period
CREATE UNIQUE INDEX "trend_findings_title_periodStart_key" ON "trend_findings"("title", "periodStart");
