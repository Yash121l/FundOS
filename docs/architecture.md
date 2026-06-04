# SignalOS — System Architecture

## Overview

FundOS is a monorepo-based, AI-native operational platform for venture capital firms. It is not a dashboard. It is a workflow system that replaces the combination of Notion, Google Sheets, email threads, and PDFs that most VC ops teams rely on today.

The architecture is designed around three principles from AGENTS.md:
1. **Performance First** — server-side computation, streaming, cached aggregations
2. **Reliability First** — correctness over speed, auditability baked in
3. **Workflow First** — AI enhances workflows; the system works without AI

---

## Repository Structure

```
fundos/
├── apps/
│   ├── web/          # Next.js 15 — primary user interface
│   ├── api/          # Hono — REST/RPC backend
│   └── workers/      # Trigger.dev — background jobs
├── packages/
│   ├── ui/           # Shared component library (shadcn-based)
│   ├── database/     # Prisma schema, migrations, seed
│   ├── ai/           # Domain AI services
│   ├── analytics/    # Health scoring, metrics computation
│   ├── shared/       # Utilities, constants, formatters
│   └── types/        # Shared TypeScript types
├── turbo.json
├── pnpm-workspace.yaml
└── package.json
```

No shared logic lives inside `apps/`. Apps consume packages. Cross-app duplication is a design failure.

---

## Application Layer

### apps/web

**Stack:** Next.js 15 (App Router), React 19, TypeScript, TailwindCSS v4, shadcn/ui, TanStack Query, TanStack Table, Recharts, Framer Motion

**Rendering strategy:**
- Server Components by default for all data-displaying pages
- Client Components only for interactivity: forms, command palette, real-time updates
- Suspense + streaming for all data fetches — no loading spinners blocking full pages
- Optimistic UI for update submissions and task creation

**Route structure:**
```
app/
├── (auth)/
│   ├── sign-in/
│   └── sign-up/
├── (shell)/                    # Authenticated shell with sidebar
│   ├── layout.tsx              # Global nav, command palette, theme
│   ├── page.tsx                # Executive Dashboard
│   ├── portfolio/
│   │   ├── page.tsx            # Portfolio table
│   │   └── [id]/
│   │       └── page.tsx        # Company detail
│   ├── updates/
│   │   ├── page.tsx            # Updates inbox
│   │   └── new/
│   │       └── page.tsx        # Submit update
│   ├── trends/
│   │   └── page.tsx            # Trend detection
│   ├── lp-reports/
│   │   ├── page.tsx            # Report list
│   │   ├── new/
│   │   │   └── page.tsx        # Generate report
│   │   └── [id]/
│   │       └── page.tsx        # Report viewer
│   └── intelligence/
│       └── page.tsx            # Market intelligence feed
└── api/                        # Next.js API routes (thin proxies to apps/api)
```

**Key shared UI patterns:**
- `CommandPalette` — global `⌘K` navigation, search, actions
- `MetricCard` — standardized metric display with trend indicators
- `HealthBadge` — color-coded health status (Healthy / Watchlist / At Risk)
- `UpdateCard` — founder update display with AI summary
- `Timeline` — chronological event display for company detail
- `EmptyState` — intentional empty states with next-action prompts
- `SkeletonLoader` — skeleton states for every data-bearing component

---

### apps/api

**Stack:** Hono, TypeScript, Zod, Prisma, PostgreSQL, Redis

**Structure:**
```
src/
├── routes/
│   ├── companies.ts
│   ├── updates.ts
│   ├── metrics.ts
│   ├── reports.ts
│   ├── trends.ts
│   ├── signals.ts
│   └── tasks.ts
├── services/
│   ├── company.service.ts
│   ├── update.service.ts
│   ├── health.service.ts
│   ├── report.service.ts
│   └── trend.service.ts
├── repositories/
│   ├── company.repo.ts
│   ├── update.repo.ts
│   └── metrics.repo.ts
├── middleware/
│   ├── auth.ts             # Clerk JWT verification
│   ├── validate.ts         # Zod schema validation
│   ├── audit.ts            # Audit log writer
│   └── error.ts            # Centralized error handling
└── lib/
    ├── db.ts               # Prisma client singleton
    ├── redis.ts            # Redis client
    └── logger.ts           # Structured logging
```

**Design rules:**
- Database models are never exposed directly — always mapped through service layer
- All routes are validated with Zod schemas
- All mutations write an audit log entry
- N+1 queries are banned — use `include` and batched queries
- Request/response types are shared via `packages/types`

**API conventions:**
```
GET    /api/companies              — list with filters
GET    /api/companies/:id          — company + latest metrics
GET    /api/companies/:id/metrics  — metric history
POST   /api/companies/:id/updates  — submit founder update
GET    /api/updates                — updates inbox with filters
POST   /api/reports/generate       — trigger report generation job
GET    /api/reports/:id            — report content + status
GET    /api/trends                 — trend findings
GET    /api/signals                — market intelligence feed
```

---

### apps/workers

**Stack:** Trigger.dev v3

**Jobs:**
```
jobs/
├── process-founder-update.ts    # Post-submission AI analysis
├── generate-lp-report.ts        # Full LP report generation pipeline
├── run-trend-analysis.ts        # Portfolio-wide trend detection
├── ingest-market-signals.ts     # Market intelligence ingestion
└── compute-health-scores.ts     # Nightly health score recomputation
```

**Key constraint:** No long-running work happens inside request handlers. The API triggers jobs; jobs call AI; jobs write results back to the database.

**Job: process-founder-update**
```
Trigger: POST /api/companies/:id/updates (on commit)
Steps:
  1. Extract metrics from update
  2. Compute new health score
  3. Run Portfolio Analyst AI → generate summary, risks, opportunities, actions
  4. Write AI outputs to database
  5. Trigger trend re-analysis if applicable
  6. Notify portfolio team if health changed to At Risk
```

**Job: generate-lp-report**
```
Trigger: POST /api/reports/generate
Steps:
  1. Fetch selected companies + their metrics + recent updates
  2. Compute fund-level aggregates
  3. Run LP Reporting Agent → narrative, highlights, risks section
  4. Assemble full report structure
  5. Render PDF via Puppeteer/html-pdf
  6. Store PDF + markdown in database
  7. Mark report as ready
```

---

## Package Layer

### packages/database

Prisma schema with PostgreSQL. Contains:
- All model definitions
- All migrations (never manual schema changes)
- Seed script generating 30 realistic portfolio companies
- Database client export

### packages/ai

Four domain services, not a chatbot:

**PortfolioAnalyst** — analyzes a single company's metrics + update history
```typescript
interface PortfolioAnalystInput {
  company: Company
  latestUpdate: FounderUpdate
  metricsHistory: MetricSnapshot[]
  previousUpdates: FounderUpdate[]
}
interface PortfolioAnalystOutput {
  healthSummary: string
  risks: Risk[]
  opportunities: Opportunity[]
  suggestedActions: Action[]
}
```

**LPReportingAgent** — generates quarterly LP report narrative
```typescript
interface LPReportInput {
  quarter: string
  companies: CompanyWithMetrics[]
  fundMetrics: FundAggregates
}
interface LPReportOutput {
  executiveSummary: string
  portfolioHighlights: string
  riskSection: string
  growthNarrative: string
}
```

**TrendDetectionAgent** — finds cross-portfolio patterns
```typescript
interface TrendInput {
  updates: FounderUpdate[]          // last 90 days, all companies
  metricsHistory: MetricSnapshot[]
}
interface TrendOutput {
  findings: TrendFinding[]          // each with evidence[] pointing to companies
}
```

**MarketIntelligenceAgent** — enriches signals with portfolio relevance
```typescript
interface SignalInput {
  signal: MarketSignal
  portfolio: Company[]
}
interface SignalOutput {
  relevantCompanyIds: string[]
  relevanceExplanation: string
}
```

Every AI execution writes to the audit log: prompt, model, duration, token usage, output.

### packages/analytics

Pure TypeScript functions — no AI, no I/O. Deterministic health scoring.

```typescript
// Health score: 0–100
function computeHealthScore(metrics: MetricSnapshot[]): HealthScore

// Health status bucket
function classifyHealth(score: number): 'healthy' | 'watchlist' | 'at-risk'

// Fund-level aggregates
function aggregateFundMetrics(companies: CompanyWithMetrics[]): FundAggregates

// Runway projection
function projectRunway(burn: number, cash: number): number

// Growth trend
function computeGrowthTrend(history: MetricSnapshot[]): 'accelerating' | 'stable' | 'decelerating'
```

Health scoring algorithm:
```
score = (
  growthScore * 0.35 +         // MoM/YoY growth rate
  revenueTrendScore * 0.25 +   // revenue direction (3-month)
  runwayScore * 0.25 +         // months of runway
  burnEfficiencyScore * 0.15   // burn / revenue ratio
)
```

Thresholds: Healthy ≥ 65, Watchlist 40–64, At Risk < 40

### packages/types

Shared TypeScript types consumed by all apps and packages. Single source of truth.

```typescript
// Core domain types
export type Company
export type FounderUpdate
export type MetricSnapshot
export type HealthScore
export type Risk
export type Opportunity
export type Action
export type Task
export type LPReport
export type TrendFinding
export type MarketSignal
export type AuditLog

// API request/response types
export type ApiResponse<T>
export type PaginatedResponse<T>
export type CreateUpdateRequest
export type GenerateReportRequest
```

---

## Data Flow

### Founder Update → Portfolio Intelligence

```
Founder submits update (web form)
    → POST /api/companies/:id/updates
    → Validate with Zod
    → Write FounderUpdate to DB (append-only)
    → Trigger: process-founder-update job
    → Job: compute new health score (packages/analytics)
    → Job: run PortfolioAnalyst AI
    → Job: write Risks, Opportunities, Actions to DB
    → Job: if health changed, emit alert
    → Dashboard reflects new state
```

### LP Report Generation

```
Partner selects quarter + companies
    → POST /api/reports/generate
    → Create LPReport record (status: generating)
    → Trigger: generate-lp-report job
    → Job: fetch all data
    → Job: run LPReportingAgent AI (streaming)
    → Job: assemble sections
    → Job: render PDF
    → Job: update LPReport (status: ready, pdf_url, markdown)
    → Partner sees report (polling or SSE)
```

### Trend Detection

```
Nightly cron (or on update submit)
    → Trigger: run-trend-analysis job
    → Job: fetch all updates from last 90 days
    → Job: run TrendDetectionAgent
    → Job: upsert TrendFinding records
    → Trends page reflects new findings
```

---

## Authentication

Clerk handles auth. The API verifies JWTs on every request. User roles:
- `partner` — full access
- `portfolio_ops` — full access except LP report export
- `finance` — LP reports + fund metrics only
- `founder` — update submission only, own company only

---

## Caching Strategy

- Redis: company list with health scores (TTL: 5min)
- Redis: fund aggregate metrics (TTL: 5min)
- Redis: trend findings (TTL: 1hr)
- Next.js: static shell components
- TanStack Query: client-side cache with stale-while-revalidate

---

## Observability

- Sentry: error tracking on web, api, workers
- PostHog: product analytics (feature usage, flow completion rates)
- Structured logging on api (JSON, includes trace IDs)
- AI audit logs: every LLM call stored in DB

---

## Environment Variables

```
# Auth
CLERK_SECRET_KEY
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY

# Database
DATABASE_URL
DIRECT_URL

# Redis
REDIS_URL

# AI
OPENAI_API_KEY

# Workers
TRIGGER_SECRET_KEY

# Observability
SENTRY_DSN
NEXT_PUBLIC_POSTHOG_KEY
```

---

## Non-Negotiables

From AGENTS.md:

1. Historical data is never overwritten. Always append.
2. AI outputs must be traceable to source records.
3. The system must work when AI is unavailable.
4. `pnpm lint`, `pnpm typecheck`, `pnpm build` must pass before any task is done.
5. No console errors in production builds.
