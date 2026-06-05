# SignalOS Setup

SignalOS is an AI-native venture intelligence and portfolio operations platform. It helps fund teams track portfolio health, founder updates, LP reporting, market signals, financial performance, cap tables, and operational workflows from one workspace.

The product is workflow-first: the app remains useful without external AI keys. When optional AI or worker services are missing, local development falls back to deterministic or inline behavior where possible.

## Prerequisites

- Node.js 20+
- PNPM 9.15+
- Docker Desktop

## Fast Start

```bash
cp .env.example .env.local
make dev
```

Then open:

- Web app: http://localhost:3000
- API health: http://localhost:3001/health

`make dev` starts Postgres and Redis in Docker, installs dependencies, generates Prisma, applies migrations, seeds demo data, and starts the web/API apps.

## Demo Logins

All seeded demo accounts use:

```text
Password: signalos2026
```

| Role | Email | Landing |
| --- | --- | --- |
| Analyst | admin@signalos.vc | Internal dashboard |
| Partner | partner@signalos.vc | Read-only internal dashboard |
| Portfolio Ops | ops@signalos.vc | Internal dashboard |
| Finance | finance@signalos.vc | Internal dashboard |
| Founder | founder@signalos.vc | Founder portal |
| LP | lp@signalos.vc | LP reports |

If login returns `Invalid email or password`, the usual cause is an unseeded or mismatched database. Run:

```bash
pnpm db:seed
```

For native local development, the expected database URL is:

```text
postgresql://signalos:signalos@localhost:5433/signalos
```

## Environment Files

Use the root `.env.example` as the only template.

- `.env.local`: native local development
- `.env.docker`: Docker Compose development

Do not create package-level env examples. Prisma, Next.js, API, workers, and Docker are documented against the same root template.

Important local defaults:

```text
DATABASE_URL=postgresql://signalos:signalos@localhost:5433/signalos
DIRECT_URL=postgresql://signalos:signalos@localhost:5433/signalos
REDIS_URL=redis://localhost:6380
NEXT_PUBLIC_API_URL=http://localhost:3001
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3008
```

Docker Compose overrides database and Redis URLs inside containers to:

```text
DATABASE_URL=postgresql://signalos:signalos@db:5432/signalos
REDIS_URL=redis://redis:6379
```

## Useful Commands

```bash
pnpm install
pnpm db:generate
pnpm db:migrate
pnpm db:seed
pnpm dev
```

Quality gates:

```bash
pnpm lint
pnpm typecheck
pnpm build
pnpm test
```

Docker helpers:

```bash
make up
make down
make logs
make reset
make studio
```

## Access Model

SignalOS uses local email/password auth in development.

- Internal roles can access the operating workspace.
- Founder users can access only their linked company portal.
- LP users can access only assigned LP reports.
- User management actions require a writable internal role.
- Session cookies are HTTP-only and session tokens are stored hashed in the database.

## Optional Services

These are not required for local setup:

- `OPENAI_API_KEY`: enables model-backed AI agents; otherwise rule-based agents run.
- `TRIGGER_SECRET_KEY`: enables Trigger.dev jobs; otherwise local workflows use fallbacks where implemented.
- `NEWS_API_KEY`: enables live market signal ingestion.
- `EMAIL_WEBHOOK_SECRET`: secures inbound founder-update webhooks. Required in production.
- PostHog and Sentry env vars enable observability.

## Troubleshooting

### Login says invalid email or password

Confirm the app and Prisma are using the same database:

```bash
node -e "console.log(process.env.DATABASE_URL)"
```

Then reseed:

```bash
pnpm db:seed
```

### Port conflicts

Native dev expects:

- Web: `3000`
- API: `3001`
- Postgres: `5433`
- Redis: `6380`

Docker-only app mode exposes the web app at http://localhost:3008.

### Prisma client issues

Regenerate Prisma:

```bash
pnpm db:generate
```

### Start from a clean local database

```bash
make reset
```
