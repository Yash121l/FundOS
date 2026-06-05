# SignalOS — Makefile
#
# make up      → full Docker stack (build images, migrate, seed, start — first run)
# make down    → stop containers, preserve volumes
# make reset   → wipe volumes and start fresh
# make logs    → tail all service logs
# make seed    → re-run seed against running DB
# make studio  → print Prisma Studio command
# make dev     → local native dev (infra in Docker, apps on host)
# make infra-up / infra-down → manage only db+redis containers

.PHONY: up down logs reset migrate seed studio dev infra-up infra-down

# Prefer `docker compose` plugin; fall back to `docker-compose` standalone
COMPOSE := $(shell docker compose version >/dev/null 2>&1 && echo "docker compose" || echo "docker-compose")

# Postgres credentials — docker-compose.yml exposes port 5433 on the host
LOCAL_DB_URL := postgresql://signalos:signalos@localhost:5433/signalos

# ── Docker (make up) ──────────────────────────────────────────────────────────

up:
	@if [ ! -f .env.docker ]; then \
		cp .env.example .env.docker; \
		sed -i '' \
			-e 's|DATABASE_URL=postgresql://signalos:signalos@localhost:5433|DATABASE_URL=postgresql://signalos:signalos@db:5432|' \
			-e 's|DIRECT_URL=postgresql://signalos:signalos@localhost:5433|DIRECT_URL=postgresql://signalos:signalos@db:5432|' \
			-e 's|REDIS_URL=redis://localhost:6380|REDIS_URL=redis://redis:6379|' \
			.env.docker; \
		echo "Created .env.docker from .env.example (Docker URLs applied)"; \
	fi
	$(COMPOSE) up --build

down:
	$(COMPOSE) down

logs:
	$(COMPOSE) logs -f

migrate:
	$(COMPOSE) run --rm migrate sh -c "pnpm --filter @fundos/database migrate:deploy"

seed:
	$(COMPOSE) run --rm migrate sh -c "pnpm db:seed"

studio:
	@echo "Run: DATABASE_URL=$(LOCAL_DB_URL) pnpm db:studio"

reset:
	$(COMPOSE) down -v
	$(COMPOSE) up --build

# ── Local native dev (infra in Docker, apps on host) ─────────────────────────

dev:
	@printf '\n'
	@printf '  ╔══════════════════════════════════════════════════════╗\n'
	@printf '  ║          SignalOS — Local Development Mode           ║\n'
	@printf '  ║                                                      ║\n'
	@printf '  ║  Web  →  http://localhost:3000                       ║\n'
	@printf '  ║  API  →  http://localhost:3001                       ║\n'
	@printf '  ║                                                      ║\n'
	@printf '  ║  Login:  admin@signalos.vc / Password123!            ║\n'
	@printf '  ╚══════════════════════════════════════════════════════╝\n'
	@printf '\n'
	@set -e; \
	if [ ! -f .env.local ]; then cp .env.example .env.local; echo "  Created .env.local from .env.example"; fi; \
	$(COMPOSE) up db redis -d && \
	echo "  Waiting for Postgres…" && \
	_timeout=30; _elapsed=0; \
	until $(COMPOSE) exec -T db pg_isready -U signalos -d signalos >/dev/null 2>&1; do \
	  sleep 1; _elapsed=$$((_elapsed+1)); \
	  if [ $$_elapsed -ge $$_timeout ]; then echo "ERROR: Postgres not ready after $$_timeout s" >&2; exit 1; fi; \
	done && \
	echo "  Postgres ready." && \
	pnpm install && \
	pnpm db:generate && \
	DATABASE_URL=$(LOCAL_DB_URL) DIRECT_URL=$(LOCAL_DB_URL) pnpm --filter @fundos/database migrate:deploy && \
	DATABASE_URL=$(LOCAL_DB_URL) DIRECT_URL=$(LOCAL_DB_URL) pnpm db:seed && \
	pnpm --filter @fundos/web --filter @fundos/api dev

infra-up:
	$(COMPOSE) up db redis -d

infra-down:
	$(COMPOSE) stop db redis
