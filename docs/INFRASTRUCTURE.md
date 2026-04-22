# Infrastructure Specification

---

## 1. Docker Compose Architecture

```yaml
# docker-compose.yml — Complete Stack
services:
  # ============================================================================
  # CORE SERVICES
  # ============================================================================

  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_USER: ${POSTGRES_USER:-llm}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: ${POSTGRES_DB:-llm_platform}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U llm"]
      interval: 10s
      timeout: 5s
      retries: 5

  nats:
    image: nats:2.10-alpine
    command: ["-js", "--max_mem_store256MB", "--max_file_store1GB"]
    environment:
      NATS_PORT: 4222
      NATS_MONITORING_PORT: 8222
    volumes:
      - nats_data:/data
    ports:
      - "4222:4222"
      - "8222:8222"
    healthcheck:
      test: ["CMD", "wget", "-q", "--spider", "http://localhost:8222/healthz"]
      interval: 10s
      timeout: 3s
      retries: 3

  redis:
    image: redis:7-alpine
    command: redis-server --appendonly yes --maxmemory 256mb --maxmemory-policy allkeys-lru
    volumes:
      - redis_data:/data
    ports:
      - "6379:6379"
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 3s
      retries: 3

  minio:
    image: minio/minio:latest
    command: server /data --console-address ":9001"
    environment:
      MINIO_ROOT_USER: ${MINIO_USER:-minioadmin}
      MINIO_ROOT_PASSWORD: ${MINIO_PASSWORD:-minioadmin}
    volumes:
      - minio_data:/data
    ports:
      - "9000:9000"
      - "9001:9001"
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:9000/minio/health/live"]
      interval: 30s
      timeout: 20s
      retries: 3

  # ============================================================================
  # VECTOR DATABASE
  # ============================================================================

  qdrant:
    image: qdrant/qdrant:v1.12
    volumes:
      - qdrant_data:/qdrant/storage
    ports:
      - "6333:6333"
      - "6334:6334"
    healthcheck:
      test: ["CMD", "wget", "-q", "--spider", "http://localhost:6333/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  # ============================================================================
  # ORY STACK
  # ============================================================================

  kratos:
    image: oryd/kratos:v1.2.0
    volumes:
      - ./ory/kratos.yml:/etc/kratos/kratos.yml:ro
      - kratos_db:/var/lib/kratos/data
    ports:
      - "4433:4433"
      - "4434:4434"
    depends_on:
      - postgres
    environment:
      DSN: postgres://llm:llm@postgres:5432/kratos?sslmode=disable

  keto:
    image: oryd/keto:v0.12.0
    volumes:
      - ./ory/keto.yml:/etc/keto/keto.yml:ro
      - keto_data:/var/lib/keto/data
    ports:
      - "4460:4460"
      - "4461:4461"
    depends_on:
      - postgres

  oathkeeper:
    image: oryd/oathkeeper:v0.42.0
    volumes:
      - ./ory/oathkeeper.yml:/etc/oathkeeper/oathkeeper.yml:ro
      - ./ory/rules.yml:/etc/oathkeeper/rules.yml:ro
    ports:
      - "4455:4455"
      - "4456:4456"
    depends_on:
      - kratos

  hydra:
    image: oryd/hydra:v2.4.0
    volumes:
      - ./ory/hydra.yml:/etc/hydra/hydra.yml:ro
      - hydra_data:/var/lib/hydra
    ports:
      - "4444:4444"
      - "4445:4445"
    depends_on:
      - postgres

  # ============================================================================
  # OBSERVABILITY — Victoria Stack
  # ============================================================================

  victoriametrics:
    image: victoriametrics/victoria-metrics:latest
    command:
      - --storage.maxDiskUsagePath=/var/lib/victoria-metrics-data
      - --http.responseHeaders.enabled=true
      - --http.responseHeaders=X-Custom-Header:llm-platform
    volumes:
      - victoria_data:/var/lib/victoria-metrics-data
    ports:
      - "8428:8428"
      - "8089:8089"
    healthcheck:
      test: ["CMD", "wget", "-q", "--spider", "http://localhost:8428/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  loki:
    image: grafana/loki:3.0
    command: -config.file=/etc/loki/local-config.yaml
    volumes:
      - loki_data:/loki
    ports:
      - "3100:3100"
    healthcheck:
      test: ["CMD", "wget", "-q", "--spider", "http://localhost:3100/ready"]
      interval: 30s
      timeout: 10s
      retries: 3

  tempo:
    image: grafana/tempo:2.4
    command: -config.file=/etc/tempo/config.yaml
    volumes:
      - tempo_data:/var/tempo
    ports:
      - "4317:4317"
      - "4318:4318"
    healthcheck:
      test: ["CMD", "wget", "-q", "--spider", "http://localhost:4317/ready"]
      interval: 30s
      timeout: 10s
      retries: 3

  grafana:
    image: grafana/grafana:11.0
    volumes:
      - ./grafana/dashboards:/etc/grafana/provisioning/dashboards:ro
      - ./grafana/datasources:/etc/grafana/provisioning/datasources:ro
      - grafana_data:/var/lib/grafana
    environment:
      GF_AUTH_ANONYMOUS_ENABLED: ${GRAFANA_ANONYMOUS:-false}
      GF_SECURITY_ADMIN_USER: ${GRAFANA_ADMIN:-admin}
      GF_SECURITY_ADMIN_PASSWORD: ${GRAFANA_PASSWORD}
    ports:
      - "3000:3000"
    depends_on:
      - victoriametrics
      - loki
      - tempo

  # ============================================================================
  # VECTOR (Log Agent)
  # ============================================================================

  vector:
    image: timberio/vector:0.41
    volumes:
      - ./vector/vector.toml:/etc/vector/vector.toml:ro
      - /var/run/docker.sock:/var/run/docker.sock:ro
    ports:
      - "9001:9001"
    environment:
      VECTOR_LOG: info

  # ============================================================================
  # APPLICATION
  # ============================================================================

  api:
    build:
      context: .
      dockerfile: apps/api/Dockerfile
    environment:
      DATABASE_URL: postgres://llm:llm@postgres:5432/llm_platform
      NATS_URL: nats://nats:4222
      REDIS_URL: redis://redis:6379
      MINIO_ENDPOINT: minio:9000
      QDRANT_URL: http://qdrant:6333
      KETO_URL: http://keto:4460
      KRATOS_URL: http://kratos:4433
      VICTORIA_URL: http://victoriametrics:8428
    ports:
      - "8080:8080"
    depends_on:
      postgres:
        condition: service_healthy
      nats:
        condition: service_healthy
      redis:
        condition: service_healthy

  worker:
    build:
      context: .
      dockerfile: apps/worker/Dockerfile
    environment:
      DATABASE_URL: postgres://llm:llm@postgres:5432/llm_platform
      NATS_URL: nats://nats:4222
      REDIS_URL: redis://redis:6379
    deploy:
      replicas: 2
    depends_on:
      - postgres
      - nats
      - redis

  frontend:
    build:
      context: .
      dockerfile: apps/frontend/Dockerfile
    environment:
      PUBLIC_API_URL: http://api:8080
      PUBLIC_KRATOS_URL: http://kratos:4433
    ports:
      - "5173:5173"
    depends_on:
      - api

volumes:
  postgres_data:
  nats_data:
  redis_data:
  minio_data:
  kratos_db:
  keto_data:
  hydra_data:
  victoria_data:
  loki_data:
  tempo_data:
  grafana_data:
  qdrant_data:
```

---

## 2. Environment Variables

```bash
# .env

# ============================================================================
# Database
# ============================================================================
POSTGRES_USER=llm
POSTGRES_PASSWORD=secure_password_here
POSTGRES_DB=llm_platform

# ============================================================================
# NATS
# ============================================================================
NATS_PORT=4222

# ============================================================================
# MinIO
# ============================================================================
MINIO_USER=minioadmin
MINIO_PASSWORD=minioadmin_secure

# ============================================================================
# Grafana
# ============================================================================
GRAFANA_ADMIN=admin
GRAFANA_PASSWORD=admin_secure
GRAFANA_ANONYMOUS=false

# ============================================================================
# Ory
# ============================================================================
# Kratos — session secrets (generate random)
KRATOS_SECRETS_DEFAULT=replace_with_random_secret_at_least_32_bytes
# Keto — read/write tokens
KETO_READONLY_TOKEN=readonly_token_here
KETO_WRITE_TOKEN=write_token_here
# Hydra — OAuth secrets
HYDRA_SECRETS_DEFAULT=replace_with_random_secret_here

# ============================================================================
# Application
# ============================================================================
JWT_SECRET=your_jwt_secret_at_least_32_bytes
ENCRYPTION_KEY=your_encryption_key_32_bytes
```

---

## 3. Service Ports

| Service | Port | Internal | Description |
|---------|------|----------|-------------|
| **API** | 8080 | :8080 | NestJS API |
| **Frontend** | 5173 | :5173 | SvelteKit |
| **PostgreSQL** | 5432 | :5432 | Main DB |
| **NATS** | 4222 | :4222 | Messaging |
| **NATS Monitor** | 8222 | :8222 | NATS monitoring |
| **Redis** | 6379 | :6379 | Cache + Sessions |
| **MinIO** | 9000 | :9000 | S3 API |
| **MinIO Console** | 9001 | :9001 | Admin UI |
| **Grafana** | 3000 | :3000 | Dashboards |
| **VictoriaMetrics** | 8428 | :8428 | Metrics + PromQL |
| **Loki** | 3100 | :3100 | Log aggregation |
| **Tempo** | 4317 | :4317 | Traces (OTLP) |
| **Vector Agent** | 9001 | :9001 | Log forwarder |
| **Qdrant** | 6333 | :6333 | Vector DB |
| **Krato** | 4433/4434 | :4433 | Auth API |
| **Keto** | 4460/4461 | :4460 | Permissions |
| **Oathkeeper** | 4455/4456 | :4455 | API Gateway |
| **Hydra** | 4444/4445 | :4444 | OAuth2 |

---

## 4. NATS Subject Architecture

```
# ============================================================================
# LLM Inference
# ============================================================================
llm.inference.request           # Any worker
llm.inference.{worker-id}.request

llm.inference.response          # Response back
llm.inference.{worker-id}.response

# ============================================================================
# Embeddings
# ============================================================================
llm.embedding.request
llm.embedding.response

# ============================================================================
# Reranking
# ============================================================================
llm.rerank.request
llm.rerank.response

# ============================================================================
# Chat Events (for SSE)
# ============================================================================
chat.{chatId}.message
chat.{chatId}.streaming

# ============================================================================
# Agent Execution
# ============================================================================
agent.execution.start
agent.execution.progress
agent.execution.complete
agent.execution.error

# ============================================================================
# Agent Workers (by model type)
# ============================================================================
agent.worker.gpt-4o.request
agent.worker.llama.request
agent.worker.claude.request

# ============================================================================
# Knowledge Base
# ============================================================================
knowledge.index.document
knowledge.search.request
knowledge.search.response

# ============================================================================
# MCP Tools
# ============================================================================
mcp.tool.execute
mcp.tool.result

# ============================================================================
# Admin / System
# ============================================================================
system.config.updated
system.metrics.push            # For monitoring
```

---

## 5. Redis Keys Pattern

```
# ============================================================================
# Sessions (Kratos)
# ============================================================================
session:{sessionId}           # TTL from Kratos config

# ============================================================================
# Cache
# ============================================================================
cache:model:{modelId}          # Model config cache
cache:user:{userId}:limits    # Rate limits

# ============================================================================
# Rate Limiting
# ============================================================================
ratelimit:{userId}:{window}   # INCR with TTL
ratelimit:ip:{ip}:{window}

# ============================================================================
# Temporary Data
# ============================================================================
temp:chat:{chatId}:streaming   # Streaming state
temp:agent:{executionId}      # Agent execution state
```

---

## 6. S3 Bucket Structure

```
llm-platform/
├── chats/
│   └── {chatId}/
│       └── {messageId}/
│           └── attachments/
│               └── {filename}
├── knowledge/
│   └── {kbId}/
│       └── documents/
│           ├── {docId}/
│           │   └── original/{filename}
│           └── chunks/
│               └── {docId}-chunk-{n}.json
├── agents/
│   └── {agentId}/
│       └── tools/
│           └── {filename}
└── avatars/
    └── {userId}.{ext}
```

---

## 7. K3s Migration Path

### Phase 1: Docker Compose (Current)
- All services in single compose file
- Manual scaling via `docker-compose up --scale worker=N`

### Phase 2: K3s Preparation
- Add healthchecks to all services
- Add resource limits
- Add proper networking
- Prepare Helm charts

### Phase 3: K3s Deployment
```yaml
# k3s/manifests/api-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: llm-platform-api
spec:
  replicas: 3
  selector:
    matchLabels:
      app: llm-platform-api
  template:
    spec:
      containers:
        - name: api
          image: llm-platform/api:latest
          resources:
            limits:
              cpu: "2000m"
              memory: "2Gi"
          envFrom:
            - configMapRef:
                name: llm-platform-config
```

### K3s Services
```yaml
# PostgreSQL, NATS, Redis — as StatefulSets
# MinIO — with persistence
# Ory Stack — with proper networking
# Victoria Stack — with persistent storage
# API, Worker, Frontend — Deployments with HPA
```

---

## 8. Observability Configuration

### VictoriaMetrics Scraping
```yaml
# prometheus.yml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'llm-platform'
    static_configs:
      - targets: ['api:8080']
        labels:
          service: 'api'
  
  - job_name: 'llm-workers'
    static_configs:
      - targets: ['worker:8080']
        labels:
          service: 'worker'

  - job_name: 'node-exporter'
    static_configs:
      - targets: ['node-exporter:9100']
```

### Loki Pipeline (Vector)
```toml
# vector.toml
[sources.docker]
type = "docker_logs"

[sinks.loki]
type = "loki"
endpoint = "http://loki:3100"

[sinks.loki.encoding]
codec = "json"
```

### OpenTelemetry
```typescript
// apps/api/src/main.ts
import { NodeSDK } from '@opentelemetry/sdk-node';
import { JaegerExporter } from '@opentelemetry/exporter-jaeger';
import { HttpInstrumentation } from '@opentelemetry/instrumentation-http';
import { NestInstrumentation } from '@opentelemetry/instrumentation-nestjs';

const sdk = new NodeSDK({
  serviceName: 'llm-platform-api',
  traceExporter: new JaegerExporter({
    endpoint: 'http://tempo:4317/api/traces',
  }),
  instrumentations: [
    new HttpInstrumentation(),
    new NestInstrumentation(),
  ],
});
```

---

## 9. Health Check Endpoints

| Service | Endpoint | Expected |
|---------|----------|----------|
| API | `GET /health` | `{"status":"ok"}` |
| Worker | `GET /health` | `{"status":"ok"}` |
| NATS | `GET /healthz` | `{"status":"ok"}` |
| PostgreSQL | `pg_isready` | `0` |
| Redis | `redis-cli ping` | `PONG` |
| MinIO | `GET /minio/health/live` | `200` |
| Qdrant | `GET /health` | `200` |
| VictoriaMetrics | `GET /health` | `200` |
| Loki | `GET /ready` | `200` |
| Tempo | `GET /ready` | `200` |

---

## 10. Backup & Restore

```yaml
# docker-compose.backup.yml
services:
  backup-postgres:
    image: postgres:15-alpine
    command: >
      sh -c 'echo "Waiting for Postgres..." &&
            sleep 30 &&
            pg_dump -h postgres -U llm llm_platform > /backup/llm_platform_$$(date +%Y%m%d_%H%M%S).sql'
    volumes:
      - ./backups:/backup
    depends_on:
      - postgres

  restore-postgres:
    image: postgres:15-alpine
    command: >
      sh -c 'echo "Waiting for Postgres..." &&
            sleep 30 &&
            psql -h postgres -U llm llm_platform < /backup/llm_platform_latest.sql'
    volumes:
      - ./backups:/backup
    depends_on:
      - postgres
```