# FundOS — Implementation Plan

## Execution Philosophy

Build in the order that maximizes visible progress and catches structural problems early. The database schema is the contract between all layers — it must be right before anything else runs. The app shell comes next so every feature builds into a real UI. Features are then layered in from highest to lowest business value.

**Definition of Done for every phase:**
- `pnpm lint` passes
- `pnpm typecheck` passes  
- `pnpm build` passes
- No console errors
- Relevant tests pass

---

## Phase 1 — Foundation

**Goal:** A working monorepo where all packages compile and the basic dev environment runs.  
**Outcome:** `pnpm dev` starts the web app showing a placeholder page. All packages build.

### 1.1 — Monorepo Scaffold

- [ ] Initialize PNPM workspace (`pnpm-workspace.yaml`)
- [ ] Create `turbo.json` with `build`, `dev`, `lint`, `typecheck` pipelines
- [ ] Root `package.json` with workspace scripts
- [ ] `.npmrc` with `shamefully-hoist=false`, `strict-peer-dependencies=false`
- [ ] `tsconfig.base.json` with strict TypeScript settings
- [ ] `.eslintrc` with TypeScript + React rules
- [ ] `.prettierrc`
- [ ] `.gitignore`

### 1.2 — packages/types

- [ ] Initialize package with `tsconfig.json` extending base
- [ ] Define all domain types (Company, FounderUpdate, MetricSnapshot, Risk, Opportunity, Action, Task, LPReport, TrendFinding, MarketSignal, AuditLog)
- [ ] Define API request/response types
- [ ] Define enums (Sector, Stage, HealthStatus, etc.)
- [ ] Export everything from `index.ts`

### 1.3 — packages/shared

- [ ] Initialize package
- [ ] Date formatting utilities
- [ ] Currency formatting utilities
- [ ] Health score display helpers
- [ ] Percentage formatters
- [ ] Pluralization helpers

### 1.4 — packages/analytics

- [ ] Initialize package
- [ ] `computeHealthScore(metrics: MetricSnapshot[]): number`
- [ ] `classifyHealth(score: number): HealthStatus`
- [ ] `aggregateFundMetrics(companies: CompanyWithMetrics[]): FundAggregates`
- [ ] `projectRunway(burn: number, cash: number): number`
- [ ] `computeGrowthTrend(history: MetricSnapshot[]): GrowthTrend`
- [ ] Unit tests for scoring algorithm edge cases

### 1.5 — packages/database

- [ ] Initialize package with Prisma
- [ ] Configure `schema.prisma` with all models from database-design.md
- [ ] `DATABASE_URL` environment setup
- [ ] Generate Prisma client
- [ ] Export `db` singleton

### 1.6 — packages/ai

- [ ] Initialize package
- [ ] `PortfolioAnalyst` service stub (interface only, placeholder implementation)
- [ ] `LPReportingAgent` service stub
- [ ] `TrendDetectionAgent` service stub
- [ ] `MarketIntelligenceAgent` service stub
- [ ] AI audit log writer utility
- [ ] OpenAI client configuration

### 1.7 — packages/ui

- [ ] Initialize package with TailwindCSS v4
- [ ] Configure shadcn/ui as base
- [ ] Export path configuration in `package.json`

### 1.8 — apps/web

- [ ] Initialize Next.js 15 app with App Router
- [ ] Configure TypeScript, TailwindCSS v4
- [ ] Configure Clerk authentication
- [ ] Install TanStack Query, TanStack Table, Recharts, Framer Motion
- [ ] Basic health check page: `/` renders without errors

### 1.9 — apps/api

- [ ] Initialize Hono application
- [ ] Configure TypeScript
- [ ] Health check route: `GET /health`
- [ ] Clerk JWT middleware
- [ ] Error handling middleware
- [ ] Prisma connection test

### 1.10 — apps/workers

- [ ] Initialize Trigger.dev v3 project
- [ ] Configure TypeScript
- [ ] Basic health check task
- [ ] Connect to database package

---

## Phase 2 — Database

**Goal:** Complete schema deployed, 30 portfolio companies seeded with realistic data.  
**Outcome:** A database query for portfolio health returns 30 companies with believable metrics.

### 2.1 — Schema Finalization

- [ ] Review and finalize all Prisma models
- [ ] Run initial migration: `prisma migrate dev --name init`
- [ ] Verify all indexes are created
- [ ] Verify all foreign key constraints

### 2.2 — Seed Data Generator

The seed must produce realistic, investor-ready data. Not lorem ipsum.

- [ ] Create `packages/database/seed/companies.ts` — 30 company definitions (name, sector, stage, description, founding year)
- [ ] Create `packages/database/seed/metrics.ts` — metric trajectory generator
  - Generates 18 months of monthly snapshots
  - Applies sector-appropriate growth curves
  - Introduces realistic variance (acceleration, plateau, decline)
  - Calculates health scores per snapshot
- [ ] Create `packages/database/seed/updates.ts` — founder update generator
  - 6–18 updates per company spanning 18 months
  - Realistic narrative text per sector (SaaS, AI, Fintech, DevTools, ClimateTech)
  - Fundraising status progression
  - Wins and risks matched to metric trajectory
- [ ] Create `packages/database/seed/risks.ts` — risk generator
  - AI-style risks based on metric signals
  - Mix of OPEN/RESOLVED
- [ ] Create `packages/database/seed/trends.ts` — 5–8 cross-portfolio trends
- [ ] Create `packages/database/seed/signals.ts` — 20–30 market signals
- [ ] Wire everything into `packages/database/seed/index.ts`
- [ ] Run seed: `pnpm db:seed`
- [ ] Verify: query health distribution matches 20/7/3 split

### 2.3 — Database Scripts

- [ ] `pnpm db:migrate` — run migrations
- [ ] `pnpm db:seed` — run seed
- [ ] `pnpm db:reset` — drop + remigrate + reseed
- [ ] `pnpm db:studio` — open Prisma Studio

---

## Phase 3 — Application Shell

**Goal:** The authenticated shell renders with sidebar, topbar, and command palette. Every route shows a skeleton state, not an error.  
**Outcome:** A partner can navigate between all routes via keyboard.

### 3.1 — Authentication

- [ ] Clerk `<ClerkProvider>` in root layout
- [ ] `(auth)` route group with sign-in/sign-up pages
- [ ] `middleware.ts` protecting all routes except auth
- [ ] Redirect after login to `/`

### 3.2 — Shell Layout

- [ ] `(shell)/layout.tsx` — authenticated wrapper
- [ ] `Sidebar` component
  - Logo + wordmark
  - Navigation items with active state
  - Unread badges (updates, trends)
  - Collapsible (`⌘B`)
  - User avatar + role at bottom
- [ ] `Topbar` component
  - Page title (from route)
  - Search trigger (`⌘K`)
  - Notification bell
  - User menu
- [ ] `CommandPalette` component (`⌘K`)
  - Company search (live, debounced)
  - Route navigation
  - Recent pages
  - Action shortcuts
- [ ] Theme: dark-first, monospace-adjacent, information-dense
  - Color tokens: background, surface, border, muted, accent, destructive
  - Typography: Inter for UI, tabular numerals for metrics
  - Spacing: 4px base grid

### 3.3 — Skeleton States

Every data-bearing component must have a skeleton variant:
- [ ] `MetricCardSkeleton`
- [ ] `CompanyRowSkeleton`
- [ ] `UpdateCardSkeleton`
- [ ] `ChartSkeleton`
- [ ] `TrendCardSkeleton`

### 3.4 — Global UI Components (packages/ui)

- [ ] `MetricCard` — value, label, trend indicator, delta
- [ ] `HealthBadge` — Healthy/Watchlist/At Risk with color
- [ ] `TrendIndicator` — up/down/flat arrow with percentage
- [ ] `SectorBadge` — color-coded sector label
- [ ] `StageBadge` — stage label
- [ ] `EmptyState` — icon, title, description, optional CTA
- [ ] `PageHeader` — title, description, action buttons
- [ ] `Timeline` — vertical event list
- [ ] `RiskCard` — severity badge, title, description, status
- [ ] `StatGroup` — row of MetricCards

---

## Phase 4 — Executive Dashboard

**Goal:** A partner can land on `/` and understand portfolio health within 10 seconds.  
**Outcome:** The most important screen. Everything must be correct and polished.

### 4.1 — Data Layer

- [ ] `GET /api/dashboard` — single endpoint returning all dashboard data
  - Portfolio health counts (healthy/watchlist/at-risk)
  - Fund aggregates (total MRR, avg growth, total burn)
  - 5 most recent updates (unreviewed)
  - 3 most recent alerts (health changes, new risks)
  - 3 active trends
  - Portfolio health distribution data for chart
- [ ] Redis cache: dashboard response, TTL 5 minutes
- [ ] Cache invalidation on: new update submitted, health score change

### 4.2 — Dashboard Components

- [ ] `PortfolioHealthSummary` — three chips: Healthy (N), Watchlist (N), At Risk (N)
  - Clicking a chip filters to `/portfolio?health=...`
- [ ] `FundMetricsRow` — Total MRR, Avg Growth, Total Burn, Avg Runway
  - With delta vs previous quarter
- [ ] `AtRiskPanel` — list of at-risk + watchlist companies
  - Company name, health badge, one-line reason
  - Click → company detail
- [ ] `RecentUpdatesPanel` — last 5 updates
  - Company, time ago, health change indicator
  - "N unreviewed" badge
- [ ] `TrendsSummaryPanel` — 3 active trends
  - Title, company count, severity
  - Click → /trends
- [ ] `PortfolioHealthChart` — donut or horizontal bar
  - Clean, not decorative
  - Recharts
- [ ] `RecentAlertsPanel` — health changes, new critical risks
  - Time-sorted
  - Dismissible

### 4.3 — Dashboard Page Assembly

- [ ] Server Component fetches all data
- [ ] Suspense boundaries around each panel
- [ ] "Last updated" timestamp in topbar
- [ ] Mobile-responsive grid layout
- [ ] Keyboard: tab navigable, all interactive elements accessible

---

## Phase 5 — Portfolio Module

**Goal:** `/portfolio` table + `/portfolio/[id]` detail. Company detail feels like a mini operating system.

### 5.1 — Portfolio Table (`/portfolio`)

- [ ] `GET /api/companies` with filter/sort/search params
  - Filters: sector, stage, health status
  - Sort: name, revenue, growth, burn, runway, health score
  - Search: company name
  - Pagination: cursor-based
- [ ] TanStack Table implementation
  - Columns: Company, Sector, Stage, MRR, MoM Growth, Burn, Runway, Health Score, Status
  - Sortable columns
  - Fixed-width metric columns with tabular numerals
  - Health badge in status column
  - Row click → company detail
- [ ] Filter bar above table
- [ ] Column visibility toggle
- [ ] Keyboard: `j/k` row navigation, `Enter` to open

### 5.2 — Company Detail (`/portfolio/[id]`)

Three-column layout (or tab-based on mobile):
- Left: Company profile + current metrics
- Center: Main content (updates, risks, actions)
- Right: Sidebar (signals, tasks)

**Sections:**

- [ ] **Company Header** — logo, name, sector, stage, status, health badge, website link
- [ ] **Metrics Row** — MRR, Growth, Burn, Runway, Headcount (current + delta)
- [ ] **Metrics History Chart** — MRR over 12 months (Recharts area chart)
- [ ] **Health Score Breakdown** — component scores with explanation
- [ ] **Open Risks** — list of OPEN risks, sorted by severity
- [ ] **Open Opportunities** — list of OPEN opportunities
- [ ] **Suggested Actions** — pending actions with priority
- [ ] **Founder Updates Timeline** — chronological, most recent first
  - Update card: period, health delta, AI summary, expand for full text
  - "View all" link
- [ ] **Tasks** — open tasks for this company
- [ ] **Market Signals** — relevant signals linked to this company

### 5.3 — Data Layer

- [ ] `GET /api/companies/:id` — full company + latest metrics
- [ ] `GET /api/companies/:id/metrics` — 18-month history
- [ ] `GET /api/companies/:id/updates` — paginated updates
- [ ] `GET /api/companies/:id/risks` — open + resolved risks
- [ ] `GET /api/companies/:id/actions` — pending actions

---

## Phase 6 — Founder Updates

**Goal:** Founders can submit updates in under 3 minutes. Portfolio ops can review an inbox efficiently.

### 6.1 — Update Submission (`/updates/new`)

- [ ] Multi-step form (not a long scroll)
  - Step 1: Metrics (MRR, burn, cash, headcount)
  - Step 2: Narrative (wins, risks, hiring, fundraising)
  - Step 3: Review + submit
- [ ] Previous period values shown as reference
- [ ] Auto-calculate runway (cash / burn)
- [ ] Auto-calculate MoM growth ((current - previous) / previous)
- [ ] Progress indicator
- [ ] `POST /api/companies/:id/updates`
- [ ] Trigger `process-founder-update` background job
- [ ] Confirmation screen with "AI summary ready in ~30 seconds" message
- [ ] Polling for AI summary completion

### 6.2 — Updates Inbox (`/updates`)

- [ ] `GET /api/updates` — all updates, sorted by unreviewed + recency
  - Filter: company, period, reviewed/unreviewed
- [ ] Update card design
  - Company + health change chip
  - Key metrics delta row
  - AI summary (first 2 sentences)
  - Risk tags + request tags
  - Review/dismiss actions
- [ ] Full update view (modal or slide-over)
  - Full narrative
  - AI summary + source tracking
  - Risk cards with quote
  - Action buttons: "Create task", "Assign request", "Mark reviewed"
- [ ] Keyboard: `j/k` navigation, `r` mark reviewed, `t` create task

### 6.3 — Background Job: process-founder-update

- [ ] Trigger.dev job triggered on update submission
- [ ] Compute new MetricSnapshot from update data
- [ ] Run PortfolioAnalyst AI service
- [ ] Write Risks to DB
- [ ] Write Opportunities to DB
- [ ] Write Actions to DB
- [ ] Update Company.healthScore and Company.healthStatus
- [ ] Write AuditLog entry
- [ ] If health changed to AT_RISK: emit alert (stored as notification)

### 6.4 — AI: PortfolioAnalyst Implementation

- [ ] Implement PortfolioAnalyst using OpenAI + Vercel AI SDK
- [ ] System prompt: investor-grade, no hallucination, cite sources
- [ ] Output validation with Zod
- [ ] Structured output: healthSummary, risks[], opportunities[], suggestedActions[]
- [ ] Log every call: prompt, model, duration, tokens, output

---

## Phase 7 — Trend Detection

**Goal:** `/trends` shows cross-portfolio patterns with evidence and actionability.

### 7.1 — Trend Detection Job

- [ ] Trigger.dev job: `run-trend-analysis`
  - Scheduled: daily at 2am
  - Also triggered: after every 5th founder update
- [ ] Fetch all updates from last 90 days
- [ ] Run TrendDetectionAgent
- [ ] Upsert TrendFinding records
- [ ] Write TrendEvidence records

### 7.2 — AI: TrendDetectionAgent Implementation

- [ ] Implement using OpenAI + Vercel AI SDK
- [ ] Input: array of update narratives with company metadata
- [ ] Detect patterns: repeated risks, hiring patterns, growth signals, fundraising themes
- [ ] Output: TrendFinding[] each with evidence[] citing specific companies + quotes
- [ ] Minimum evidence threshold: 3 companies per trend
- [ ] Deduplicate against existing trends

### 7.3 — Trends Page (`/trends`)

- [ ] `GET /api/trends` — active trends, sorted by affected company count
- [ ] Trend card
  - Title, category badge, company count, severity
  - 1-2 sentence summary
  - Evidence preview (3 company names)
  - "View Evidence" + "Create Action" CTAs
- [ ] Evidence expand/modal
  - Each piece: company name, update period, quote
  - Click company → company detail
- [ ] Create Action from trend
  - Modal: title, assignee, due date
  - Action linked to all affected companies
- [ ] Dismissed trends section (collapsed)

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

- [ ] Implement using OpenAI + Vercel AI SDK streaming
- [ ] Sections generated:
  - Executive Summary
  - Portfolio Highlights (top performers, major wins)
  - Portfolio Risks (at-risk companies + context)
  - Fund Metrics (narrative around aggregate numbers)
  - Appendix: company-by-company summary table
- [ ] Each claim must reference source metric
- [ ] Tone: professional investor communication
- [ ] Output as structured sections for incremental streaming

### 8.3 — Report Generator (`/lp-reports/new`)

- [ ] Configuration form
  - Quarter selector
  - Company multi-select (default all active)
  - Tone selector
- [ ] "Generate Report" → `POST /api/reports/generate` → returns report ID
- [ ] SSE stream for generation progress
  - "Fetching data..." → "Generating executive summary..." → "Ready"
- [ ] Report preview renders as sections complete (streaming)

### 8.4 — Report Viewer (`/lp-reports/[id]`)

- [ ] Section display with markdown rendering
- [ ] Each section: title + content + "Regenerate section" button
- [ ] Inline editing of any section
- [ ] Export PDF button
- [ ] Export Markdown button
- [ ] Version history (list of previous versions of same quarter)

### 8.5 — Report List (`/lp-reports`)

- [ ] Table: quarter, companies included, status, generated by, created at
- [ ] Status badges: Generating / Ready / Exported
- [ ] Click → report viewer

---

## Phase 9 — Market Intelligence

**Goal:** `/intelligence` shows a signal feed with portfolio relevance.

### 9.1 — Mock Signal Data

- [ ] 30–50 realistic market signals in seed data
  - Funding announcements in portfolio sectors
  - Competitor IPOs/acquisitions
  - Regulatory developments
  - Market trend articles
- [ ] Each signal linked to 1–3 portfolio companies
- [ ] Publish dates spanning last 90 days

### 9.2 — Intelligence Feed (`/intelligence`)

- [ ] `GET /api/signals` — paginated, filtered by category/sector
- [ ] Signal card
  - Title, source, published date
  - 2-sentence summary
  - Related companies chips (click → company detail)
  - Category badge
- [ ] Filter bar: All / Funding / Competitor / Market / Regulatory
- [ ] "Mark as read" interaction
- [ ] Empty state: "No new signals this week"

### 9.3 — Signal Architecture (future-ready)

- [ ] `packages/ai/MarketIntelligenceAgent` implementation stub
- [ ] Trigger.dev job: `ingest-market-signals` (stub — mock data only in MVP)
- [ ] Architecture supports Exa/Tavily/Firecrawl integration later
- [ ] Signal → company relevance scoring prepared

---

## Quality Gates

### After Phase 1
- [ ] `pnpm build` succeeds across all packages and apps
- [ ] `pnpm typecheck` passes with zero errors
- [ ] `pnpm lint` passes

### After Phase 2
- [ ] Database schema matches design document
- [ ] Seed produces exactly 30 companies
- [ ] Health distribution: 20 healthy / 7 watchlist / 3 at-risk
- [ ] All companies have 18 months of metric snapshots

### After Phase 3
- [ ] Sidebar renders with correct navigation
- [ ] `⌘K` opens command palette
- [ ] All routes accessible from navigation
- [ ] No console errors on any route

### After Phase 4
- [ ] Dashboard loads in under 2 seconds (seeded data)
- [ ] Portfolio health summary shows correct counts
- [ ] At-risk companies visible above the fold
- [ ] Fund metrics aggregate correctly

### After Phase 5
- [ ] Portfolio table renders 30 companies
- [ ] Filters work correctly
- [ ] Company detail shows all sections
- [ ] Metric history chart renders correctly

### After Phase 6
- [ ] Update form submits successfully
- [ ] AI analysis runs within 60 seconds
- [ ] Updates inbox shows unreviewed updates
- [ ] Mark reviewed works

### After Phase 7
- [ ] Trends page shows at least 5 trends from seed data
- [ ] Each trend has evidence with company quotes
- [ ] Creating action from trend works

### After Phase 8
- [ ] Report generates without errors
- [ ] All 5 sections populated
- [ ] PDF export works
- [ ] Markdown export works

### After Phase 9
- [ ] Signal feed shows seed signals
- [ ] Company relevance links work
- [ ] Filters work

---

## Environment Setup Requirements

```bash
# Required before Phase 1
- Node.js 20+
- PNPM 9+
- PostgreSQL 15+ (local or Supabase)
- Redis (local or Upstash)

# Required before Phase 6 (AI features)
- OPENAI_API_KEY

# Required before workers
- TRIGGER_SECRET_KEY (Trigger.dev project)

# Required before auth
- CLERK_SECRET_KEY
- NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
```

---

## Estimated Phase Complexity

| Phase | Description | Complexity |
|---|---|---|
| 1 | Foundation | Medium — monorepo config is fiddly |
| 2 | Database | High — seed data quality determines demo quality |
| 3 | App Shell | Medium — UX standards are high |
| 4 | Dashboard | High — most important screen, must be polished |
| 5 | Portfolio | High — most complex data display |
| 6 | Founder Updates | High — form UX + background jobs |
| 7 | Trend Detection | Medium — AI + display |
| 8 | LP Reporting | High — streaming AI + PDF export |
| 9 | Intelligence | Low — mostly display + mock data |
