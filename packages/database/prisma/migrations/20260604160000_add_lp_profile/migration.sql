-- Phase 11.3: Add lpProfile column to LP reports for personalisation
ALTER TABLE "lp_reports" ADD COLUMN "lp_profile" JSONB;

-- GIN index enables efficient JSONB containment queries (@>) on lp_profile
CREATE INDEX "lp_reports_lp_profile_gin_idx" ON "lp_reports" USING GIN ("lp_profile");
