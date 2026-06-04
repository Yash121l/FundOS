# AGENTS.md

---

## Session Protocol — SecondBrain

This project is tracked in Yash's SecondBrain at `~/Documents/SecondBrain/`.

### On every new session

1. Read `~/Documents/SecondBrain/BRAIN.md` — who Yash is, active projects, preferences
2. Read `~/Documents/SecondBrain/projects/fundos.md` — current phase, last session, open questions
3. Tell Yash ONE line: `🧠 FundOS — [last thing done / what's next]`

Then answer what Yash asked.

### Log every decision

Whenever a significant decision is made (architecture, library choice, pattern, trade-off), run this immediately:

```bash
echo '{
  "title": "Short title",
  "context": "Why this came up",
  "options": "What else was considered",
  "chosen": "What was decided",
  "why": "Full reasoning",
  "tradeoffs": "What was given up",
  "project": "fundos"
}' | ~/Documents/SecondBrain/hooks/log-decision.sh
```

Examples: choosing one package over another, file/folder structure, API design, deciding not to add something.

### When Yash says "save" or "sync"

1. Fill in the active session file (newest in `~/Documents/SecondBrain/_sessions/`):
   - `## 🎯 Goal` — what was accomplished this session
   - `## 📝 What Yash Should Know` — plain language summary
2. Update `~/Documents/SecondBrain/projects/fundos.md`:
   - Current Status (branch, phase, what changed, open items)
   - Sessions table row for today
   - Key Decisions — add anything new
   - Open Questions / Next Steps
3. Update `~/Documents/SecondBrain/BRAIN.md`:
   - Active Projects row — update Last Worked date and Status
   - Session Log — add today's row

---

## Project Overview

SignalOS is an AI-native venture intelligence and portfolio operations platform.

The platform helps venture capital firms operate larger portfolios with smaller teams by transforming founder updates, portfolio metrics, market signals, and fund data into actionable operational intelligence.

SignalOS is not an AI chatbot.

SignalOS is a workflow platform.

Every feature must solve a real problem experienced by investors, platform teams, fund operations teams, or portfolio founders.

---

## Core Mission

Allow a venture fund to:

* Understand portfolio health instantly
* Generate LP reports in minutes
* Detect portfolio-wide trends
* Track founder requests
* Monitor market developments
* Reduce operational overhead

The system should create operational leverage.

A team of five should feel like a team of twenty.

---

## Engineering Principles

### Performance First

Performance is a feature.

Prefer:

* Server-side computation
* Streaming responses
* Optimistic updates
* Cached aggregations
* Background processing

Avoid:

* Excessive client state
* Unnecessary rerenders
* Large client bundles
* Waterfall requests

Every feature should feel instant.

---

### Reliability First

Incorrect data is worse than missing data.

Always prioritize:

1. Correctness
2. Reliability
3. Auditability
4. Performance

over implementation speed.

---

### Workflow First

AI enhances workflows.

AI does not replace workflows.

The platform must remain useful even when AI services are unavailable.

Users should always be able to:

* View data
* Create updates
* Review metrics
* Generate reports

without requiring AI.

---

### Data Before Intelligence

Present facts before conclusions.

Show:

Revenue
Growth
Runway

before

AI interpretation.

Every generated insight must be traceable back to source records.

---

## Monorepo

Package Manager:

PNPM

Build System:

Turborepo

Repository Structure:

apps/
web
api
workers

packages/
ui
database
ai
analytics
shared
types

Never place shared logic inside applications.

Shared functionality belongs in packages.

Duplicate logic across applications is considered a design failure.

---

## Frontend

Application:

apps/web

Stack:

* Next.js 15
* React 19
* TypeScript
* TailwindCSS v4
* shadcn/ui
* TanStack Query
* TanStack Table
* Recharts
* Framer Motion

Guidelines:

* Server Components by default
* Client Components only when required
* Suspense everywhere possible
* Mobile responsive
* Keyboard accessible

UI Inspiration:

* Linear
* Stripe
* Ramp
* Vercel

Avoid:

* Marketing style dashboards
* Excessive animations
* Decorative components

The UI should feel like a professional operating system.

---

## Backend

Application:

apps/api

Stack:

* Hono
* TypeScript
* Zod
* Prisma
* PostgreSQL
* Redis

Requirements:

* Fully typed APIs
* Request validation
* Centralized error handling
* Structured logging
* Audit logging

Never expose database models directly.

Always create service layers.

Suggested Structure:

src/
routes/
services/
repositories/
middleware/
lib/
jobs/

---

## Background Processing

Application:

apps/workers

Stack:

* Trigger.dev

Responsibilities:

* LP report generation
* Trend analysis
* Founder reminder workflows
* Market intelligence ingestion
* AI processing

Long-running tasks must never execute inside request handlers.

---

## Database

Package:

packages/database

Stack:

* PostgreSQL
* Prisma

Requirements:

* Migrations only
* No schema drift
* Indexed foreign keys
* Avoid N+1 queries

Design for:

* Historical founder updates
* Audit trails
* Report generation
* Trend analysis

Historical data must never be overwritten.

Always append.

---

## AI Architecture

Package:

packages/ai

AI is implemented as domain services.

Never create a generic chatbot.

---

### Portfolio Analyst

Inputs:

* Founder updates
* Metrics
* Historical performance

Outputs:

* Health summaries
* Risks
* Suggested actions

---

### LP Reporting Agent

Inputs:

* Fund data
* Portfolio metrics
* Founder updates

Outputs:

* Quarterly LP reports
* Fund summaries
* Investor communications

---

### Trend Detection Agent

Inputs:

* Portfolio-wide data

Outputs:

* Shared risks
* Emerging trends
* Operational insights

---

### Market Intelligence Agent

Inputs:

* News feeds
* Funding events
* Competitor activity

Outputs:

* Relevant market signals
* Sector developments

---

## External Services

Authentication:

* Clerk

Queueing:

* Trigger.dev

Search:

* Exa
* Tavily

Web Intelligence:

* Firecrawl

Caching:

* Redis

Observability:

* Sentry
* PostHog

---

## Observability

Every AI execution must log:

* Prompt
* Inputs
* Outputs
* Model
* Duration
* Token Usage

Every critical workflow must be traceable.

The system should support debugging without reproducing failures.

---

## Test-Driven Development

All feature work starting from Phase 6 follows TDD.

Write tests before writing implementation code.

The cycle is:

1. Write a failing test that describes the desired behavior
2. Write the minimum implementation to make it pass
3. Refactor, then confirm tests still pass

### What to test

* All pure functions in packages/analytics and packages/shared
* All UI components in packages/ui
* All API route handlers in apps/api
* All service layer functions in apps/api/src/services
* All repository functions in apps/api/src/repositories

### Test runner

Framework: Vitest

Node packages use environment: node

React packages use environment: jsdom with @testing-library/react

Run all tests:

pnpm test

Run tests for a single package:

pnpm --filter @fundos/analytics test

Run tests in watch mode:

pnpm --filter @fundos/analytics test:watch

### Test file placement

Co-locate tests with source files:

packages/analytics/src/__tests__/health-score.test.ts
packages/shared/src/__tests__/formatting.test.ts
packages/ui/src/__tests__/button.test.tsx

### What not to test

* Server Components that require a running database
* Prisma queries in apps/web/src/lib — these are integration tests that require a real database
* Next.js routing and middleware — test via E2E (Phase 9)

---

## Definition of Done

Before any task is considered complete:

pnpm lint

must pass

pnpm typecheck

must pass

pnpm build

must pass

pnpm test

must pass

Additionally:

* No TypeScript errors
* No accessibility violations
* No duplicate logic
* No console errors
* Tests written before implementation for all new pure functions and components

---

## Non Goals

Do not build:

* Generic AI assistants
* ChatGPT wrappers
* Pitch deck summarizers
* Standalone memo generators

Build:

An operating system for venture capital firms.

---

## Success Criteria

A partner should be able to:

1. Open SignalOS
2. Understand portfolio health
3. Identify at-risk companies
4. Review founder updates
5. Generate LP reports
6. Discover trends

within five minutes.

If this experience is not achieved, the feature is incomplete.

