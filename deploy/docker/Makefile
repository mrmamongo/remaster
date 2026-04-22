# Docker Compose Helper Scripts

# Start all services
start: docker compose up -d

# Stop all services
stop: docker compose down

# View logs
logs: docker compose logs -f

# View status
status: docker compose ps

# Health check all services
health: @docker compose ps | grep -E "(llm-|llm-)" | awk '{print $$1, $$4}'

# Reset all data (dangerous!)
reset: docker compose down -v

# Initialize databases
init: docker compose exec postgres psql -U llm -c "CREATE DATABASE IF NOT EXISTS kratos;"
	docker compose exec postgres psql -U llm -c "CREATE DATABASE IF NOT EXISTS keto;"
	docker compose exec postgres psql -U llm -c "CREATE DATABASE IF NOT EXISTS hydra_oauth2;"

# Connect to postgres
psql: docker compose exec postgres psql -U llm -d llm_platform

# Connect to nats
nats-cli: docker compose exec nats natscli

# Connect to redis
redis: docker compose exec redis redis-cli

# Connect to minio mc
minio: docker compose exec minio mc alias set llm-local http://localhost:9000 minioadmin minioadmin123

# View kratos logs
kratos-logs: docker compose logs -f kratos

# View keto logs
keto-logs: docker compose logs -f keto

# View victoria logs
victoria-logs: docker compose logs -f victoriametrics

# Restart a service
restart-service: docker compose restart $(service)

# Rebuild a service
rebuild: docker compose build $(service) --no-cache
	docker compose up -d $(service)

.PHONY: start stop logs status health reset init psql nats-cli redis minio kratos-logs keto-logs victoria-logs restart-service rebuild