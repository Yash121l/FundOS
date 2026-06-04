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
- [x] `PortfolioAnalyst` — rule-based implementation (no OpenAI required)
- [x] `TrendDetectionAgent` — rule-based implementation (no OpenAI required)
- [x] `LPReportingAgent` — stub (Phase 8)
- [x] `MarketIntelligenceAgent` — stub (Phase 9)
- [x] `writeAIAuditLog` — writes to AuditLog table with JSON metadata; swallows failures
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

### 1.9 — apps/api ✅ (scaffold only — web uses server-side Prisma directly)
- [x] Hono application initialized with health check route
- [x] Clerk JWT middleware stub present
- [x] Architecture decision: web fetches DB directly; Hono reserved for external API consumers

### 1.10 — apps/workers ✅
- [x] Trigger.dev v3 initialized
- [x] `process-founder-update` job (Phase 6)
- [x] `run-trend-analysis` job with daily 2am UTC schedule (Phase 7)

---

## Phase 2 — Database ✅ COMPLETE

### 2.1 — Schema ✅
- [x] Full Prisma schema: Company, MetricSnapshot, FounderUpdate, Risk, Opportunity, Action, Task, TrendFinding, TrendEvidence, MarketSignal, LPReport, LPReportSection, AuditLog, User
- [x] All indexes and foreign key constraints

### 2.2 — Seed Data ✅
- [x] 30 portfolio companies (realistic names, sectors, stages)
- [x] 18 months of metric snapshots with sector-appropriate trajectories
- [x] Founder updates with narrative text per sector
- [x] Risks (OPEN/RESOLVED mix) based on metric signals
- [x] 5–8 cross-portfolio TrendFindings with TrendEvidence
- [x] 20–30 MarketSignals linked to portfolio companies

### 2.3 — Database Scripts ✅
- [x] `pnpm db:migrate`, `pnpm db:seed`, `pnpm db:reset`, `pnpm db:studio`

---

## Phase 3 — Application Shell ✅ COMPLETE

### 3.1 — Authentication ✅
- [x] `ClerkProvider` in root layout (conditional on env vars; build passes without credentials)
- [x] `(auth)` route group: sign-in, sign-up pages
- [x] `middleware.ts` protecting all shell routes
- [x] Redirect to `/` after login

### 3.2 — Shell Layout ✅
- [x] `(shell)/layout.tsx` — authenticated wrapper
- [x] `Sidebar` — logo, nav items, live unreviewed/trends badges, active state, user avatar
- [x] `Topbar` — page title, ⌘K trigger, user menu
- [x] `CommandPalette` — company search (live debounced via `/api/search`), route navigation, keyboard shortcuts
- [x] Dark theme with full CSS color token system (background, card, border, muted, accent, primary, destructive, status colors)

### 3.3 — Skeleton States ✅
- [x] Skeleton states implemented in all routes during placeholder phase
- [x] `Skeleton` component in `packages/ui` used throughout

### 3.4 — Global UI Components ✅
- [x] `MetricCard` — value, label, delta arrow, trend color
- [x] `HealthBadge` — dot + label, HEALTHY/WATCHLIST/AT_RISK variants
- [x] `SectorBadge` — color-coded sector chip
- [x] `EmptyState` — icon, title, description, optional CTA
- [x] `PageHeader` — title, description, action slot
- [x] `RiskCard` — implemented inline in `RisksSection` component
- [x] `TrendIndicator` — delta direction folded into `MetricCard`

---

## Phase 4 — Executive Dashboard ✅ COMPLETE

### 4.1 — Data Layer ✅
- [x] `getHealthCounts` — portfolio health distribution
- [x] `getFundMetrics` — total MRR/ARR/burn, avg growth/runway, QoQ deltas
- [x] `getAtRiskCompanies` — AT_RISK + WATCHLIST with top risk per company
- [x] `getRecentUpdates` — last N unreviewed + recent updates
- [x] `getActiveTrends` — active trends sorted by severity + affected count
- [x] `getRecentAlerts` — HIGH/CRITICAL risks created in last 14 days
- [x] `getSidebarBadges` — unreviewed updates + active trends count
- [x] Architecture: `force-dynamic` server-side fetch (Redis cache deferred — negligible at 30-company scale)

### 4.2 — Dashboard Components ✅
- [x] `PortfolioHealthSummary` — three chips with filter links to `/portfolio?health=...`
- [x] `FundMetricsRow` — Total MRR, Avg Growth, Total Burn, Avg Runway with QoQ delta
- [x] `AtRiskPanel` — at-risk + watchlist companies with health badge, top risk, metrics
- [x] `RecentUpdatesPanel` — last 5 updates with company, time ago, unreviewed count
- [x] `TrendsSummaryPanel` — active trends with severity, affected count, category
- [x] `HealthDonutChart` — Recharts donut showing HEALTHY/WATCHLIST/AT_RISK distribution
- [x] `RecentAlertsPanel` — HIGH/CRITICAL risks from last 14 days with company link, severity, time

### 4.3 — Page Assembly ✅
- [x] Server Component with `Promise.all` across all 6 data fetches
- [x] `force-dynamic` rendering (live data always)
- [x] Mobile-responsive grid layout
- [x] Footer timestamp

---

## Phase 5 — Portfolio Module ✅ COMPLETE

### 5.1 — Portfolio Table ✅
- [x] TanStack Table: Company, Sector, Stage, MRR, MoM Growth, Burn, Runway, Health Score, Status
- [x] Client-side sort on all metric columns with sort direction icons
- [x] Filter bar: sector, stage, health status
- [x] Global search by company name (debounced)
- [x] Column visibility toggle — Columns dropdown with per-column checkboxes
- [x] Row click → company detail
- [x] `j/k` keyboard row navigation + `Enter` to open
- [x] Company count (`N of M`) shown in toolbar
- [x] Architecture: all 30 companies fit one page; cursor pagination not needed

### 5.2 — Company Detail ✅
- [x] Sticky company header: name, sector, stage, health badge, country, website, founded year
- [x] Metrics row: MRR, Growth, Burn, Runway, Headcount — current values + delta vs previous period
- [x] MRR + Burn history chart (Recharts area, up to 13 months)
- [x] Health Score Breakdown — four component bars (Growth 35%, Revenue Trend 25%, Runway 25%, Burn Efficiency 15%) with color-coded scores
- [x] Risks section — OPEN/IN_PROGRESS + RESOLVED, sorted by severity, with category icons
- [x] Opportunities section — OPEN + ACTED_ON with category icons and status badges
- [x] Actions section — suggested actions with priority badges and status indicators
- [x] Tasks section — open tasks with priority dots, status, due dates
- [x] Market Signals section — relevant signals linked to this company
- [x] Founder Updates timeline — 6 most recent with AI summary, metrics, period, review status
- [x] Three-column layout (responsive to two-column on narrower screens)

### 5.3 — Data Layer ✅
- [x] `getAllCompanies` — all active companies with current period metrics
- [x] `getCompanyBySlug` — full detail: metrics (13mo), updates (6), risks, opportunities, actions, tasks
- [x] `getCompanySignals` — market signals linked to company
- [x] `/api/search` route — live company search for CommandPalette

---

## Phase 6 — Founder Updates ✅ COMPLETE

### 6.1 — Update Submission ✅
- [x] 3-step form: Metrics → Narrative → Review
- [x] Company selector (all active companies) + period selector with smart suggestion (`suggestNextPeriod`)
- [x] Previous period reference metrics shown inline
- [x] Auto-compute runway (cash ÷ burn) live as user types
- [x] Auto-compute MoM growth vs previous period live
- [x] Step progress indicator with completed state
- [x] Step validation with inline error messages
- [x] Pre-select company via `?company=slug` query param
- [x] Confirmation screen with success state after submit
- [x] Analysis runs synchronously in server action (no polling needed)

### 6.2 — Updates Inbox ✅
- [x] All / Unreviewed / Reviewed filter tabs (unreviewed-first sort)
- [x] `UpdateCard` — health badge, metrics row, AI summary, risk tags, fundraising indicator
- [x] `ReviewSheet` slide-over — full narrative, AI summary, detected risks, opportunities
- [x] Mark reviewed — server action + optimistic UI update
- [x] "Create task" — `+ Task` button in sheet footer, inline title/description form, `t` keyboard shortcut
- [x] Keyboard: `j/k` navigate cards, `Enter` open, `r` mark reviewed, `t` create task, `Esc` close

### 6.3 — Background Job ✅
- [x] `process-founder-update` Trigger.dev task with 120s max duration
- [x] Creates MetricSnapshot (upsert by companyId + period) from update data
- [x] Runs PortfolioAnalyst, writes Risks, Opportunities, and Actions to DB
- [x] Re-computes and persists Company.healthScore + healthStatus
- [x] Updates MetricSnapshot.healthScore for the period
- [x] Writes AI summary back to FounderUpdate.aiSummary
- [x] Writes AuditLog entry via `writeAIAuditLog`
- [x] AT_RISK transition detection (logged; notification model reserved for future)

### 6.4 — PortfolioAnalyst ✅
- [x] Rule-based deterministic implementation (no OpenAI required — swappable later)
- [x] Detects: critical runway (<6mo), low runway (<12mo), negative growth, high burn multiple, founder-flagged risks/wins
- [x] Generates: `healthSummary` sentence, `risks[]`, `opportunities[]`, `suggestedActions[]`
- [x] All outputs persisted to DB (Risks, Opportunities, Actions tables)

---

## Phase 7 — Trend Detection ✅ COMPLETE

### 7.1 — Trend Detection Job ✅
- [x] `run-trend-analysis` Trigger.dev task with 300s max duration
- [x] Daily schedule at 2am UTC via `schedules.task`
- [x] Fetches all founder updates from last 90 days with company metadata
- [x] Fetches metric snapshots from last 90 days
- [x] Runs TrendDetectionAgent, upserts TrendFinding + TrendEvidence records
- [x] Deduplicates by title against existing active trends
- [x] Writes AuditLog entry via `writeAIAuditLog`
- [x] `runTrendAnalysis` also exposed as server action for on-demand use (no credentials needed)

### 7.2 — TrendDetectionAgent ✅
- [x] Rule-based deterministic implementation (no OpenAI required)
- [x] 5 detection patterns:
  - Shared burn risk: 3+ companies with runway < 12 months
  - Fundraising wave: 3+ companies actively raising or with term sheets
  - Hiring pattern: 3+ companies with active hiring needs
  - Keyword clusters: shared themes in risk narratives (sales cycles, churn, regulation, AI competition, market slowdown)
  - Growth cohort: 3+ companies in sub-$50K MRR early stage
- [x] Minimum 3-company evidence threshold enforced on every finding
- [x] Each finding carries quoted evidence traceable to specific updates and companies
- [x] 7 unit tests written TDD-first before implementation

### 7.3 — Trends Page ✅
- [x] Filter bar: All / Shared Risk / Fundraising / Hiring / Growth / Operational
- [x] `TrendCard` — severity badge, category, company count, 1–2 sentence summary, company chips → company detail
- [x] Evidence expand panel with inline quotes per company
- [x] "Run Analysis" button — triggers `runTrendAnalysis` server action on-demand
- [x] Dismiss — server action marks trend DISMISSED, removes from active list
- [x] "Create Action" — inline form creates one Action per affected company, marks trend ACTIONED
- [x] Dismissed trends collapsible section with Restore button

---

## Phase 8 — LP Reporting ✅ COMPLETE

**Goal:** A partner can generate, review, and export a quarterly LP report in under 10 minutes.

### 8.1 — Report Generation Job ✅
- [x] Trigger.dev job: `generate-lp-report` with 300s max duration
- [x] Fetches selected companies with 3-period metric history
- [x] Fetches founder updates from the selected quarter
- [x] Computes fund-level aggregates via `aggregateFundMetrics`
- [x] Runs LPReportingAgent, persists LPReportSection records
- [x] Links companies via ReportCompany join table
- [x] Builds full markdown from sections, stores in LPReport.markdownContent
- [x] Updates status: GENERATING → READY
- [x] Writes AuditLog entry via `writeAIAuditLog`
- [x] Also exposed as server action for synchronous use (no Trigger.dev credentials needed)

### 8.2 — AI: LPReportingAgent Implementation ✅
- [x] Rule-based section generation (no OpenAI required — consistent with Phases 6–7)
- [x] 5 sections in order: Executive Summary, Portfolio Highlights, Portfolio Risks, Fund Metrics, Company Appendix
- [x] Executive Summary: health distribution table, fund MRR/ARR/burn, tone-adjusted opener
- [x] Portfolio Highlights: top 3 companies by MoM growth with win quotes from updates
- [x] Portfolio Risks: AT_RISK companies with detected reason (runway/growth/burn); Watchlist monitoring note
- [x] Fund Metrics: revenue narrative, burn multiple, runway distribution table, headcount
- [x] Company Appendix: full markdown table sorted alphabetically with health emoji
- [x] Tone variants: STANDARD / CONSERVATIVE / GROWTH_FOCUSED adjust framing of summary + highlights
- [x] 10 unit tests written TDD-first

### 8.3 — Report Generator (`/lp-reports/new`) ✅
- [x] Quarter selector (last 8 quarters, current pre-selected)
- [x] Tone selector with 3 options and descriptions
- [x] Company multi-select with health score badge per company (default: all active)
- [x] Select all / Deselect all toggle
- [x] Generates synchronously via server action, redirects to viewer on completion
- [x] Progress feedback shown while generating

### 8.4 — Report Viewer (`/lp-reports/[id]`) ✅
- [x] Per-section display with custom markdown renderer (headers, bold, bullets, blockquotes, tables)
- [x] Inline editing per section: Edit button → textarea → Save (calls `updateReportSection`)
- [x] Edited sections show "Edited" badge; `aiGenerated` flag updated in DB
- [x] Editing a section rebuilds and persists full `markdownContent`
- [x] Export Markdown: downloads `.md` file via Blob URL, marks report EXPORTED
- [x] Export PDF: `window.print()` with print CSS (white background, A4 margins, hides nav/toolbar)
- [x] Report metadata: title, status badge, company count, generated date
- [x] Companies included chips shown below sections

### 8.5 — Report List (`/lp-reports`) ✅
- [x] Table: title, quarter, company count, status badge, View link
- [x] Status badges: GENERATING / READY / EXPORTED (color-coded)
- [x] Empty state with CTA to generate first report
- [x] "New Report" button links to /lp-reports/new

---

## Phase 9 — Market Intelligence

**Goal:** `/intelligence` shows a signal feed with portfolio relevance.

### 9.1 — Signal Data
- [ ] Verify seed has 20–30 MarketSignals linked to portfolio companies
- [ ] Ensure signals span varied categories (Funding, Competitor, Market, Regulatory)

### 9.2 — Intelligence Feed (`/intelligence`)
- [ ] Signal card: title, source, published date, 2-sentence summary, related company chips, category badge
- [ ] Filter bar: All / Funding / Competitor / Market / Regulatory
- [ ] "Mark as read" interaction
- [ ] Empty state with helpful copy

### 9.3 — Signal Architecture
- [ ] `MarketIntelligenceAgent` stub already exists in `packages/ai`
- [ ] `ingest-market-signals` Trigger.dev job stub

---

## Quality Gates

### Phases 1–8 ✅ ALL PASSING
- `pnpm build` ✅ — clean build, zero errors
- `pnpm typecheck` ✅ — zero TypeScript errors
- `pnpm test` ✅ — 130 tests passing (ai 17, analytics 32, shared 57, ui 24)
- All routes render without errors ✅
- No unchecked items remaining in Phases 1–8 ✅

### Phase 8 Quality Gate ✅
- [x] Report generates without errors for any quarter/company selection
- [x] All 5 sections populated with real portfolio data
- [x] Markdown export downloads correctly
- [x] PDF export prints cleanly via window.print()

### After Phase 9
- [ ] Signal feed shows seed signals correctly
- [ ] Company relevance chips link to company detail
- [ ] Filters work across all categories

---

## Environment Requirements

```bash
# Phase 1–7 — no external services needed; everything runs deterministically
NODE_ENV=development

# Required for auth UI (optional — build passes without these)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=...
CLERK_SECRET_KEY=...

# Required to run migrations and seed
DATABASE_URL=postgresql://...

# Required for Trigger.dev background workers
TRIGGER_SECRET_KEY=...

# Not required — AI runs deterministically without API keys
# OPENAI_API_KEY=...   (reserved for future upgrade path)
```

---

## Key Architectural Decisions

| Item | Plan | Actual | Reason |
|------|------|--------|--------|
| AI implementation | OpenAI + Vercel AI SDK | Rule-based deterministic | No API key needed; identical interface; swappable by replacing one class |
| Data layer | REST API via Hono | Server-side Prisma in Next.js | Simpler, no extra network hop, same type safety |
| Redis cache | TTL cache on dashboard | `force-dynamic` direct DB fetch | No Redis credentials; sub-100ms at 30-company scale |
| Suspense boundaries | Suspense + streaming | Server Component `Promise.all` | Server components fetch before render; no loading states needed |
| PDF export | Puppeteer | `window.print()` + print CSS | Puppeteer adds headless Chrome binary (~300MB); print CSS is zero-dependency |
| AI audit log | Console only | Writes to AuditLog DB table | Implemented: `action=AI_ANALYSIS`, metadata JSON, silent failure |
| Column visibility | Not in original plan | TanStack `columnVisibility` state | Added as gap completion |
| Task creation from updates | Secondary flow | Implemented: inline form in ReviewSheet, `t` shortcut | Gap completion |
| Action creation from trends | Secondary flow | Implemented: creates Action per affected company | Gap completion |
