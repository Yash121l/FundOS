# ── Stage 1: base ─────────────────────────────────────────────────────────────
FROM node:22-alpine AS base
RUN apk add --no-cache libc6-compat openssl
RUN corepack enable && corepack prepare pnpm@9.15.4 --activate
WORKDIR /app

# ── Stage 2: deps — install all workspace dependencies ────────────────────────
FROM base AS deps
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json turbo.json tsconfig.base.json ./
COPY apps/api/package.json         apps/api/
COPY apps/web/package.json         apps/web/
COPY apps/workers/package.json     apps/workers/
COPY packages/ai/package.json      packages/ai/
COPY packages/analytics/package.json packages/analytics/
COPY packages/database/package.json  packages/database/
COPY packages/shared/package.json    packages/shared/
COPY packages/types/package.json     packages/types/
COPY packages/ui/package.json        packages/ui/
# Prisma postinstall needs schema.prisma to exist before `pnpm install` runs
COPY packages/database/prisma/schema.prisma packages/database/prisma/
RUN pnpm install --frozen-lockfile

# ── Stage 3: dev — used by docker-compose.yml ─────────────────────────────────
# Source is volume-mounted at runtime; this stage just pre-installs deps.
FROM deps AS dev
COPY . .
RUN pnpm --filter @fundos/database generate
EXPOSE 3000 3001
CMD ["pnpm", "dev"]

# ── Stage 4: builder — full production build ──────────────────────────────────
FROM deps AS builder
COPY . .
ENV SKIP_ENV_VALIDATION=true
RUN pnpm --filter @fundos/database generate
RUN pnpm build

# ── Stage 5: web-runner — minimal Next.js standalone production image ─────────
FROM node:22-alpine AS web-runner
RUN apk add --no-cache libc6-compat openssl
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs
WORKDIR /app

# Next.js standalone output copies only the required node_modules subset
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/static    ./apps/web/.next/static

USER nextjs
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
EXPOSE 3000
CMD ["node", "apps/web/server.js"]

# ── Stage 6: api-runner — Hono API production image ──────────────────────────
FROM node:22-alpine AS api-runner
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app

# Copy compiled API + shared workspace packages it depends on at runtime
COPY --from=builder /app/apps/api/dist                   ./apps/api/dist
COPY --from=builder /app/node_modules                    ./node_modules
COPY --from=builder /app/packages/database/src           ./packages/database/src
COPY --from=builder /app/packages/database/node_modules  ./packages/database/node_modules

ENV NODE_ENV=production
EXPOSE 3001
CMD ["node", "apps/api/dist/index.js"]
