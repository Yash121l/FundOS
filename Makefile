# SignalOS — Docker helper targets
# Detects whether `docker compose` (plugin) or `docker-compose` (standalone) is available.
# Usage: make up       (first run — builds images, migrates DB, seeds, starts everything)
#        make down     (stop containers, preserve volumes)
#        make reset    (wipe all volumes and start fresh — run after schema changes)
#        make logs     (tail all service logs)
#        make seed     (re-run seed against running db container)
#        make studio   (print Prisma Studio command)

.PHONY: up down logs reset migrate seed studio dev infra-up infra-down

# Prefer `docker compose` plugin; fall back to `docker-compose` standalone
COMPOSE := $(shell docker compose version >/dev/null 2>&1 && echo "docker compose" || echo "docker-compose")

# Postgres credentials used by docker-compose.yml, exposed on host port 5433
LOCAL_DB_URL := postgresql://signalos:signalos@localhost:5433/signalos

up:
	@if [ ! -f .env.docker ]; then cp .env.example .env.docker; echo "Created .env.docker from .env.example — add optional API keys there."; fi
	$(COMPOSE) up --build

down:
	$(COMPOSE) down

logs:
	$(COMPOSE) logs -f

migrate:
	$(COMPOSE) run --rm migrate sh -c "pnpm db:migrate"

seed:
	$(COMPOSE) run --rm migrate sh -c "pnpm db:seed"

studio:
	@echo "Run: DATABASE_URL=postgresql://signalos:signalos@localhost:5433/signalos pnpm db:studio"

reset:
	$(COMPOSE) down -v
	$(COMPOSE) up --build

# ── Local native dev (infra in Docker, apps on host) ─────────────────────────

dev:
	@set -e; \
	if [ ! -f .env.local ]; then cp .env.example .env.local; echo "Created .env.local from .env.example"; fi; \
	$(COMPOSE) up db redis -d && \
	echo "Waiting for Postgres to be ready…" && \
	until $(COMPOSE) exec -T db pg_isready -U signalos -d signalos >/dev/null 2>&1; do sleep 1; done && \
	echo "Postgres ready." && \
	pnpm install && \
	pnpm db:generate && \
	DATABASE_URL=$(LOCAL_DB_URL) DIRECT_URL=$(LOCAL_DB_URL) pnpm --filter @fundos/database migrate:deploy && \
	DATABASE_URL=$(LOCAL_DB_URL) DIRECT_URL=$(LOCAL_DB_URL) pnpm db:seed && \
	pnpm --filter @fundos/web --filter @fundos/api dev

infra-up:
	$(COMPOSE) up db redis -d

infra-down:
	$(COMPOSE) stop db redis
