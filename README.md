# FundOS

**A production-grade VC operating system for fund teams.**

FundOS is a full-stack portfolio intelligence platform that replaces the spreadsheet stack most VC firms run on. It covers the full fund workflow — portfolio health, founder updates, LP reporting, board management, financial statements, cap table tracking, and fund-level performance — with optional AI agents that layer on top of deterministic, auditable logic.

The platform remains fully functional without any external AI keys. When `OPENAI_API_KEY` is absent, all agents fall back to rule-based implementations with zero degradation to core workflows.

---

## What it does

**Portfolio Intelligence**
- Health scoring per company: growth (35%), revenue trend (25%), runway (25%), burn efficiency (15%)
- Automated trend detection across the portfolio (5 signal patterns, runs daily)
- At-risk panel and weekly AI-generated alert briefs on the executive dashboard

**Financial Platform**
- Income statements, balance sheets, cash flow statements — tabbed per company
- MRR waterfall bridge and unit economics benchmarks
- Investment tracker: funding rounds, valuations, follow-on sizing
- Cap table with safe notes, convertible notes, option pool dilution, and liquidation waterfall calculator
- CSV exports: portfolio snapshot, metric history, schedule of investments

**LP Operations**
- LP entity management with capital calls and distributions
- LPAC meetings, resolutions, and waterfall tracking (TVPI, DPI, RVPI, Net IRR, Gross MOIC)
- LP report generation with AI-drafted narrative sections, inline editing, and PDF/markdown export
- Per-LP report access control

**Founder Portal**
- Founders access only their own company — separate `/founder` route group
- Update submission form (weekly + MOR), news, escalation tracking
- Email webhook ingest (`POST /api/webhooks/founder-update`) with HMAC auth and rule-based extraction

**Board & IC**
- Board meetings, resolutions, attendees
- Follow-on notes with IC status, key metrics, and conviction tagging
- Value-add activity logging and annual valuations

**AI Agents** (all with rule-based fallbacks)
- `PortfolioQAAgent` — streaming Q&A over portfolio data (`/ask`)
- `MeetingPrepAgent` — one-click meeting prep sheet on company detail
- `LPReportingAgent` — five narrative sections per LP report
- `TrendDetectionAgent` — daily pattern detection across the portfolio
- `MarketIntelligenceAgent` — market signal ingestion (live via NewsAPI, or seeded)
- `AlertSummariserAgent` — Monday briefing job, WeeklyBrief panel on dashboard
- `MorAnalyzer` — rule-based MOR escalation (runway, burn, revenue miss thresholds)

**Access Control**
- Four roles: `ANALYST`, `PARTNER`, `FOUNDER`, `LP`
- Enforced at route level (middleware) and query level (server actions)
- Settings panel: invite users, assign roles, link founders to companies, grant LP report access

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | Next.js 15 (App Router), TailwindCSS v4, TanStack Query, TanStack Table, Recharts, Framer Motion |
| **API** | Hono (reserved for external consumers; web uses server actions + direct Prisma) |
| **Workers** | Trigger.dev v3 (trend analysis daily, alert summariser Monday 7am UTC) |
| **Database** | PostgreSQL 16, Prisma ORM (40+ models, 10+ enums) |
| **Cache** | Redis 7 (`withCache()` wrapper, 300s TTL on health counts and fund metrics) |
| **Auth** | Custom session + bcrypt (HTTP-only cookies, hashed tokens in DB) |
| **AI** | OpenAI (streaming + structured), rule-based fallback on all agents |
| **Observability** | Sentry (server errors), PostHog (product analytics) — both optional |
| **Infrastructure** | Docker Compose, pnpm workspaces, Turborepo, `make` helpers |

---

## Monorepo Structure

```
FundOS/
├── apps/
│   ├── web/          # Next.js 15 — main UI, server actions, auth middleware
│   ├── api/          # Hono — external API surface
│   └── workers/      # Trigger.dev v3 background jobs
├── packages/
│   ├── types/        # Domain types — shared contract for all packages
│   ├── shared/       # Formatting utilities, period helpers, string utils
│   ├── analytics/    # Health scoring, fund metrics, trend/runway computation
│   ├── database/     # Prisma schema, client, migrations, seed
│   ├── ai/           # Agent implementations (PortfolioAnalyst, LP, Trend, Market, Alert)
│   └── ui/           # Base component library (Button, Badge, Card, MetricCard, HealthBadge, …)
├── docker-compose.yml
├── docker-compose.prod.yml
├── Dockerfile
├── Makefile
└── turbo.json
```

---

## Quick Start

### Prerequisites

- Node.js 20+
- pnpm 9.15+
- Docker Desktop

### Docker (recommended)

```bash
cp .env.example .env.docker
make up
```

Opens on **http://localhost:3008**. `make up` builds images, applies migrations, seeds demo data, and starts all services.

### Native dev (apps on host, infra in Docker)

```bash
cp .env.example .env.local
make dev
```

Opens on **http://localhost:3000** (web) and **http://localhost:3001** (API).

`make dev` starts Postgres (port 5433) and Redis (port 6380) in Docker, installs deps, generates Prisma, applies migrations, seeds, and launches the web and API apps.

---

## Demo Accounts

All seeded accounts use password: `Password123!`

| Role | Email | Access |
|---|---|---|
| Analyst | `admin@signalos.vc` | Full internal workspace |
| Partner | `partner@signalos.vc` | Read-only internal workspace |
| Portfolio Ops | `ops@signalos.vc` | Full internal workspace |
| Finance | `finance@signalos.vc` | Full internal workspace |
| Founder | `founder@signalos.vc` | Founder portal (own company only) |
| LP | `lp@signalos.vc` | Assigned LP reports only |

---

## Environment Variables

Copy `.env.example` to `.env.local` (native) or `.env.docker` (Docker). Required variables are pre-filled for local dev; optional services degrade gracefully.

```bash
# Required
DATABASE_URL=postgresql://signalos:signalos@localhost:5433/signalos
DIRECT_URL=postgresql://signalos:signalos@localhost:5433/signalos

# Optional — app works without all of these
REDIS_URL=redis://localhost:6380
OPENAI_API_KEY=           # enables model-backed agents
TRIGGER_SECRET_KEY=       # enables background jobs
NEWS_API_KEY=             # enables live market signal ingestion
EMAIL_WEBHOOK_SECRET=     # required in production for founder email webhook
SENTRY_DSN=
NEXT_PUBLIC_POSTHOG_KEY=
```

---

## Commands

```bash
# Development
pnpm dev               # start web + API in watch mode
pnpm db:studio         # open Prisma Studio

# Database
pnpm db:generate       # regenerate Prisma client
pnpm db:migrate        # apply migrations
pnpm db:seed           # seed demo data (idempotent)
pnpm db:reset          # drop + recreate + seed

# Quality gates
pnpm lint
pnpm typecheck
pnpm build
pnpm test              # 136 unit tests (Vitest)
```

```bash
# Docker helpers
make up                # first run — build, migrate, seed, start everything
make down              # stop containers, keep volumes
make reset             # wipe all volumes and start fresh
make logs              # tail all service logs
make seed              # re-run seed against running containers
make studio            # print Prisma Studio connection command
```

---

## Health Scoring

Health scores are computed deterministically in `packages/analytics` — no AI involved.

```
score = growth(35%) + revenueTrend(25%) + runway(25%) + burnEfficiency(15%)

HEALTHY    ≥ 65
WATCHLIST  40 – 64
AT_RISK    < 40
```

Thresholds are fixed constants, not configurable at runtime, so audit trails are reproducible.

---

## Database Schema

The Prisma schema in `packages/database/prisma/schema.prisma` defines 40+ models across five domains:

| Domain | Key Models |
|---|---|
| Core | `User`, `Session`, `Company`, `MetricSnapshot`, `AuditLog` |
| Founder ops | `FounderUpdate`, `FounderNewsSubmission`, `MonthlyOperationsReport`, `MorEscalation` |
| Financials | `IncomeStatement`, `BalanceSheet`, `CashFlowStatement`, `MrrBridge`, `UnitEconomics` |
| Investment | `FundingRound`, `FundInvestment`, `ValuationMark`, `CapTableEntry`, `SafeNote`, `ConvertibleNote`, `OptionPool` |
| Fund | `FundProfile`, `CapitalActivity`, `LPReport`, `LPReportSection`, `LPReportAccess` |
| Board & LPAC | `BoardMeeting`, `BoardResolution`, `FollowOnNote`, `LPEntity`, `CapitalCall`, `Distribution`, `LPACMeeting` |
| Intelligence | `TrendFinding`, `MarketSignal`, `CompanySignal` |

---

## Architecture Notes

- **No build step for packages in dev** — source-first workspace packages, transpiled by Next.js via `transpilePackages`
- **Web hits Prisma directly** — Hono (`apps/api`) is reserved for external API consumers; internal reads/writes go through Next.js server actions
- **Redis is optional** — `withCache()` no-ops gracefully when `REDIS_URL` is absent
- **AI agents are layered** — all agents implement a rule-based path first; OpenAI is the enhancement, not the foundation
- **Single env template** — one `.env.example` at root covers Next.js, Hono, Prisma, Trigger.dev, and Docker

---

## Troubleshooting

**Login fails with "Invalid email or password"**
The app and Prisma must point to the same database. Reseed:
```bash
pnpm db:seed
```

**Port conflicts**
Native dev expects: Web `3000`, API `3001`, Postgres `5433`, Redis `6380`.
Docker app mode exposes web at `3008` to avoid conflicts.

**Prisma client out of sync**
```bash
pnpm db:generate
```

**Start from scratch**
```bash
make reset
```
