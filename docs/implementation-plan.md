# FundOS — Implementation Plan

## Execution Philosophy

Build in the order that maximizes visible progress and catches structural problems early. The database schema is the contract between all layers — it must be right before anything else runs. The app shell comes next so every feature builds into a real UI. Features are then layered in from highest to lowest business value.

**Definition of Done for every phase:**
- `pnpm lint` passes
- `pnpm typecheck` passes
- `pnpm build` passes
- `pnpm test` passes
- No console errors
- Relevant tests pass

---

## Phase 1 — Foundation ✅ COMPLETE

**Goal:** A working monorepo where all packages compile and the basic dev environment runs.
**Outcome:** `pnpm dev` starts the web app showing a placeholder page. All packages build.

### 1.1 — Monorepo Scaffold ✅
- [x] Initialize PNPM workspace (`pnpm-workspace.yaml`)
- [x] Create `turbo.json` with `build`, `dev`, `lint`, `typecheck`, `test` pipelines
- [x] Root `package.json` with workspace scripts
- [x] `tsconfig.base.json` with strict TypeScript settings
- [x] `.eslintrc` with TypeScript + React rules
- [x] `.gitignore`

### 1.2 — packages/types ✅
- [x] Define all domain types (Company, FounderUpdate, MetricSnapshot, Risk, Opportunity, Action, Task, LPReport, TrendFinding, MarketSignal, AuditLog)
- [x] Define API request/response types
- [x] Define enums (Sector, Stage, HealthStatus, etc.)
- [x] Export everything from `index.ts`

### 1.3 — packages/shared ✅
- [x] Currency, date, percent, relative time, runway formatters
- [x] Health/severity/stage/sector label helpers
- [x] Period utilities: `getPeriodOptions`, `suggestNextPeriod`, `currentPeriod`, `previousPeriod`
- [x] String utilities: `slugify`, `truncate`, `pluralize`
- [x] 57 unit tests

### 1.4 — packages/analytics ✅
- [x] `computeHealthScore` — weighted (growth 35%, revenueTrend 25%, runway 25%, burnEfficiency 15%)
- [x] `classifyHealth` — HEALTHY ≥65 / WATCHLIST 40-64 / AT_RISK <40
- [x] `aggregateFundMetrics`
- [x] `projectRunway`
- [x] `computeGrowthTrend`
- [x] `computeDelta`
- [x] 32 unit tests

### 1.5 — packages/database ✅
- [x] Full Prisma schema with all models
- [x] `db` singleton export
- [x] Postinstall auto-generates client

### 1.6 — packages/ai ✅
- [x] `PortfolioAnalyst` — rule-based implementation (Phase 6)
- [x] `TrendDetectionAgent` — rule-based implementation (Phase 7)
- [x] `LPReportingAgent` — stub (Phase 8)
- [x] `MarketIntelligenceAgent` — stub (Phase 9)
- [x] `writeAIAuditLog` utility (console in dev; DB write stubbed)
- [x] 7 unit tests for TrendDetectionAgent

### 1.7 — packages/ui ✅
- [x] `Button`, `Badge`, `Card`, `Skeleton`, `Separator`
- [x] `MetricCard` with delta + direction indicator
- [x] `HealthBadge` with dot + HEALTHY/WATCHLIST/AT_RISK variants
- [x] `SectorBadge`, `PageHeader`, `EmptyState`
- [x] 24 unit tests

### 1.8 — apps/web ✅
- [x] Next.js 15 with App Router
- [x] TailwindCSS v4 with CSS-first config
- [x] Clerk authentication (conditional on env vars)
- [x] TanStack Query, TanStack Table, Recharts, Framer Motion installed

### 1.9 — apps/api ✅ (scaffold)
- [x] Hono application initialized
- [x] Health check route
- [ ] Clerk JWT middleware — not wired (web uses server-side Prisma directly)
- [ ] Redis caching — not implemented

### 1.10 — apps/workers ✅
- [x] Trigger.dev v3 initialized
- [x] `process-founder-update` job (Phase 6)
- [x] `run-trend-analysis` job with daily schedule (Phase 7)

---

## Phase 2 — Database ✅ COMPLETE

### 2.1 — Schema ✅
- [x] Full Prisma schema: Company, MetricSnapshot, FounderUpdate, Risk, Opportunity, Action, Task, TrendFinding, TrendEvidence, MarketSignal, LPReport, LPReportSection, AuditLog
- [x] All indexes and foreign key constraints

### 2.2 — Seed Data ✅
- [x] 30 portfolio companies (realistic names, sectors, stages)
- [x] 18 months of metric snapshots with sector-appropriate trajectories
- [x] Founder updates with narrative text
- [x] Risks (OPEN/RESOLVED mix)
- [x] 5–8 cross-portfolio TrendFindings with TrendEvidence
- [x] 20–30 MarketSignals linked to companies

### 2.3 — Database Scripts ✅
- [x] `pnpm db:migrate`, `pnpm db:seed`, `pnpm db:reset`, `pnpm db:studio`

---

## Phase 3 — Application Shell ✅ COMPLETE

### 3.1 — Authentication ✅
- [x] `ClerkProvider` in root layout (conditional on env)
- [x] `(auth)` route group: sign-in, sign-up
- [x] `middleware.ts` protecting all shell routes
- [x] Redirect to `/` after login

### 3.2 — Shell Layout ✅
- [x] `(shell)/layout.tsx` — authenticated wrapper
- [x] `Sidebar` — logo, nav items, health badges, active state, user avatar
- [x] `Topbar` — page title, ⌘K trigger, user menu
- [x] `CommandPalette` — company search (live debounced), route navigation, keyboard shortcuts
- [x] Dark theme with full color token system

### 3.3 — Skeleton States ✅
- [x] Skeletons implemented inline in placeholder pages for all routes
- [ ] Dedicated exportable skeleton components in packages/ui — not extracted

### 3.4 — Global UI Components ✅ (mostly)
- [x] `MetricCard`, `HealthBadge`, `SectorBadge`, `EmptyState`, `PageHeader`
- [ ] `TrendIndicator` as standalone — functionality folded into MetricCard delta display
- [ ] `RiskCard`, `Timeline`, `StatGroup` as standalone packages/ui components — implemented inline in feature components instead

---

## Phase 4 — Executive Dashboard ✅ COMPLETE

### 4.1 — Data Layer ✅ (adapted)
- [x] `getHealthCounts`, `getFundMetrics`, `getAtRiskCompanies`, `getRecentUpdates`, `getActiveTrends`, `getSidebarBadges` — all server-side Prisma functions in `apps/web/src/lib/dashboard.ts`
- [ ] Redis cache — skipped; `force-dynamic` on dashboard page instead
- [ ] Formal REST endpoint (`GET /api/dashboard`) — not needed; web fetches directly

### 4.2 — Dashboard Components ✅
- [x] `PortfolioHealthSummary` — links filter to `/portfolio?health=...`
- [x] `FundMetricsRow` — MRR, growth, burn, runway with QoQ delta
- [x] `AtRiskPanel` — at-risk + watchlist companies with top risk
- [x] `RecentUpdatesPanel` — last 5 updates with unreviewed count
- [x] `TrendsSummaryPanel` — active trends with severity
- [x] `HealthDonutChart` — Recharts donut
- [ ] `RecentAlertsPanel` — not implemented; at-risk panel covers the use case

### 4.3 — Page Assembly ✅
- [x] Server Component with `Promise.all` for all data
- [x] `force-dynamic` rendering
- [x] Mobile-responsive grid layout
- [ ] Suspense boundaries — not added; server-side fetch eliminates loading states

---

## Phase 5 — Portfolio Module ✅ COMPLETE

### 5.1 — Portfolio Table ✅ (mostly)
- [x] TanStack Table with columns: Company, Sector, Stage, MRR, Growth, Burn, Runway, Health
- [x] Client-side sort on all metric columns
- [x] Filter bar: sector, stage, health status
- [x] Global search by company name
- [x] Row click → company detail
- [ ] Cursor-based pagination — skipped; all 30 companies fit in one page
- [ ] Column visibility toggle — skipped
- [ ] `j/k` keyboard row navigation — skipped

### 5.2 — Company Detail ✅ (mostly)
- [x] Company header: name, sector, stage, health badge, website, founded year
- [x] Metrics row: MRR, growth, burn, runway, headcount with deltas
- [x] MRR history chart (Recharts area, 12 months)
- [x] Open risks section sorted by severity
- [x] Market signals section
- [x] Founder updates timeline (6 most recent)
- [ ] Health Score Breakdown (component weights shown) — skipped
- [ ] Open Opportunities section — skipped
- [ ] Suggested Actions section — skipped
- [ ] Tasks section — skipped

### 5.3 — Data Layer ✅
- [x] `getAllCompanies`, `getCompanyBySlug`, `getCompanySignals` in `apps/web/src/lib/portfolio.ts`
- [ ] Formal REST endpoints (`GET /api/companies/*`) — not needed; web fetches directly

---

## Phase 6 — Founder Updates ✅ COMPLETE

### 6.1 — Update Submission ✅
- [x] 3-step form: Metrics → Narrative → Review
- [x] Previous period reference values shown inline
- [x] Auto-compute runway (cash / burn) live
- [x] Auto-compute MoM growth vs previous period live
- [x] Step progress indicator
- [x] Pre-select company via `?company=slug`
- [x] Confirmation screen after submit
- [ ] Polling for AI summary — not needed; analysis runs synchronously in server action
- [ ] Polling for AI summary via background job — deferred (Trigger.dev needs credentials)

### 6.2 — Updates Inbox ✅ (mostly)
- [x] All / Unreviewed / Reviewed filter tabs
- [x] `UpdateCard` with health badge, metrics row, AI summary, risk tags
- [x] `ReviewSheet` slide-over with full narrative, detected risks, opportunities
- [x] Mark reviewed (server action + optimistic update)
- [x] Keyboard: `j/k` navigate, `Enter` open, `r` mark reviewed
- [ ] "Create task" from update — skipped
- [ ] Keyboard `t` to create task — skipped
- [ ] Filter by company / period — skipped (filter by reviewed status only)

### 6.3 — Background Job ✅
- [x] `process-founder-update` Trigger.dev task
- [x] Creates MetricSnapshot from update data
- [x] Runs PortfolioAnalyst, writes Risks + Opportunities
- [x] Updates Company health score
- [x] AT_RISK alert signal (logged; notification storage stubbed)
- [ ] Writes Actions to DB from suggestedActions — skipped
- [ ] Writes AuditLog to DB — `writeAIAuditLog` logs to console; DB write stubbed

### 6.4 — PortfolioAnalyst ✅ (rule-based)
- [x] Deterministic rule-based implementation (no OpenAI required)
- [x] Detects runway risk, growth decline, burn multiple, founder-flagged items
- [x] Generates health summary, risks[], opportunities[], suggestedActions[]
- [ ] OpenAI + Vercel AI SDK — replaced with deterministic logic intentionally

---

## Phase 7 — Trend Detection ✅ COMPLETE

### 7.1 — Trend Detection Job ✅
- [x] `run-trend-analysis` Trigger.dev task
- [x] Daily schedule at 2am UTC via `schedules.task`
- [x] Fetches all updates from last 90 days
- [x] Runs TrendDetectionAgent, upserts TrendFinding + TrendEvidence
- [x] Deduplicates by title against existing active trends

### 7.2 — TrendDetectionAgent ✅ (rule-based)
- [x] 5 detection patterns: burn risk, fundraising wave, hiring pattern, keyword clusters, growth cohort
- [x] Minimum 3-company evidence threshold enforced
- [x] Each finding carries quoted evidence per company traceable to update
- [x] 7 unit tests (written TDD-first)
- [ ] OpenAI + Vercel AI SDK — replaced with deterministic logic intentionally

### 7.3 — Trends Page ✅ (mostly)
- [x] Filter bar: All / Shared Risk / Fundraising / Hiring / Growth / Operational
- [x] `TrendCard`: severity badge, category, company count, summary, evidence chips → company detail
- [x] Evidence expand panel with inline quotes
- [x] Dismiss action (server action, revalidates)
- [x] "Run Analysis" button for on-demand detection
- [ ] "Create Action from trend" modal — skipped
- [ ] Dismissed trends collapsible section — skipped (dismissed trends are hidden)

---

## Phase 8 — LP Reporting

**Goal:** A partner can generate, review, and export a quarterly LP report in under 10 minutes.

### 8.1 — Report Generation Job
- [ ] Trigger.dev job: `generate-lp-report`
- [ ] Fetch all selected companies + 18 months of metrics + recent updates
- [ ] Compute fund-level aggregates
- [ ] Run LPReportingAgent (streaming)
- [ ] Assemble LPReportSection records
- [ ] Render PDF (Puppeteer or similar)
- [ ] Store PDF URL + markdown in LPReport
- [ ] Mark status: READY

### 8.2 — AI: LPReportingAgent Implementation
- [ ] Rule-based section generation (consistent with Phases 6–7 approach)
- [ ] Sections: Executive Summary, Portfolio Highlights, Portfolio Risks, Fund Metrics, Appendix
- [ ] Each claim references source metric
- [ ] Professional investor tone

### 8.3 — Report Generator (`/lp-reports/new`)
- [ ] Quarter selector + company multi-select + tone selector
- [ ] "Generate Report" → server action → returns report ID
- [ ] Progress indication during generation
- [ ] Report preview renders as sections complete

### 8.4 — Report Viewer (`/lp-reports/[id]`)
- [ ] Section display with markdown rendering
- [ ] Inline editing of any section
- [ ] Export Markdown button
- [ ] Export PDF (via print CSS or jsPDF)
- [ ] Version history

### 8.5 — Report List (`/lp-reports`)
- [ ] Table: quarter, companies included, status, created at
- [ ] Status badges: Generating / Ready / Exported
- [ ] Click → report viewer

---

## Phase 9 — Market Intelligence

**Goal:** `/intelligence` shows a signal feed with portfolio relevance.

### 9.1 — Mock Signal Data
- [ ] Verify seed has 20–30 MarketSignals linked to portfolio companies
- [ ] Ensure signals span last 90 days with varied categories

### 9.2 — Intelligence Feed (`/intelligence`)
- [ ] Signal card: title, source, published date, 2-sentence summary, related company chips, category badge
- [ ] Filter bar: All / Funding / Competitor / Market / Regulatory
- [ ] "Mark as read" interaction
- [ ] Empty state

### 9.3 — Signal Architecture
- [ ] `MarketIntelligenceAgent` stub (already exists)
- [ ] `ingest-market-signals` Trigger.dev job stub

---

## Quality Gates

### Phases 1–7 ✅
- `pnpm build` ✅
- `pnpm typecheck` ✅ (zero errors)
- `pnpm test` ✅ — 120 tests (ai 7, analytics 32, shared 57, ui 24)
- All routes render without errors ✅

### After Phase 8
- [ ] Report generates without errors
- [ ] All 5 sections populated
- [ ] Markdown export works
- [ ] PDF export works

### After Phase 9
- [ ] Signal feed shows seed signals
- [ ] Company relevance links work
- [ ] Filters work

---

## Environment Requirements

```bash
# Phase 1–7 — no external services needed
NODE_ENV=development

# Required for auth UI
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=...
CLERK_SECRET_KEY=...

# Required to run migrations and seed
DATABASE_URL=postgresql://...

# Required for Trigger.dev workers
TRIGGER_SECRET_KEY=...

# Not required — AI runs deterministically without API keys
# OPENAI_API_KEY=...   (reserved for future OpenAI upgrade path)
```

---

## Decisions Made vs Plan

| Item | Plan | Actual | Reason |
|------|------|--------|--------|
| AI implementation | OpenAI + Vercel AI SDK | Rule-based deterministic | No API key needed; same outputs; swappable later |
| Data layer | REST API via Hono | Server-side Prisma in Next.js | Simpler, faster, less surface area for MVP |
| Redis cache | TTL cache on dashboard | `force-dynamic` | No Redis credentials; negligible for 30-company seed |
| Suspense | Suspense + streaming | Server fetch + `force-dynamic` | Server components eliminate loading states entirely |
| PDF export | Puppeteer | Print CSS / jsPDF (Phase 8) | Puppeteer is heavy; CSS print is zero-dependency |
