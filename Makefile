# SignalOS — Docker helper targets
# Usage: make up   (first run — builds images, migrates DB, seeds, starts everything)
#        make down (stop containers)
#        make logs (tail all service logs)
#        make reset (wipe DB volume and start fresh)

.PHONY: up down logs reset migrate seed studio

up:
	@if [ ! -f .env.docker ]; then cp .env.example .env.docker; echo "Created .env.docker from .env.example — add your optional API keys there."; fi
	docker compose up --build

down:
	docker compose down

logs:
	docker compose logs -f

migrate:
	docker compose run --rm migrate sh -c "pnpm db:migrate"

seed:
	docker compose run --rm migrate sh -c "pnpm db:seed"

studio:
	@echo "Run: DATABASE_URL=postgresql://signalos:signalos@localhost:5432/signalos pnpm db:studio"

reset:
	docker compose down -v
	docker compose up --build
