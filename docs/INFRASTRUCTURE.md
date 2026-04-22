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
  # VICTORIA STACK (Observability)
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
      - "9090:9090"
    healthcheck:
      test: ["CMD", "wget", "-q", "--spider", "http://localhost:8428/health"]
      interval: 30s
      timeout: 10s
      retries: 3

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

  admin:
    build:
      context: .
      dockerfile: apps/admin/Dockerfile
    environment:
      PUBLIC_API_URL: http://api:8080
      VICTORIA_URL: http://victoriametrics:8428
    ports:
      - "3000:3000"
    depends_on:
      - api
      - victoriametrics

volumes:
  postgres_data:
  nats_data:
  redis_data:
  minio_data:
  kratos_db:
  keto_data:
  hydra_data:
  victoria_data:
  qdrant_data:
```

---

## 2. Service Ports

| Service | Port | Internal | Description |
|---------|------|----------|-------------|
| **API** | 8080 | :8080 | NestJS API |
| **Frontend** | 5173 | :5173 | SvelteKit |
| **Admin Panel** | 3000 | :3000 | Grafana-like dashboards |
| **PostgreSQL** | 5432 | :5432 | Main DB |
| **NATS** | 4222 | :4222 | Messaging |
| **NATS Monitor** | 8222 | :8222 | NATS monitoring |
| **Redis** | 6379 | :6379 | Cache + Sessions |
| **MinIO** | 9000 | :9000 | S3 API |
| **MinIO Console** | 9001 | :9001 | Admin UI |
| **VictoriaMetrics** | 8428 | :8428 | Metrics + PromQL |
| **Qdrant** | 6333 | :6333 | Vector DB |
| **Krato** | 4433/4434 | :4433 | Auth API |
| **Keto** | 4460/4461 | :4460 | Permissions |
| **Oathkeeper** | 4455/4456 | :4455 | API Gateway |
| **Hydra** | 4444/4445 | :4444 | OAuth2 |

---

## 3. Environment Variables

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

---

## 8. Admin Panel — Grafana-like Dashboards

Админ-панель построена на SvelteKit + TanStack Query с дашбордами как в Grafana.

### Dashboard Structure

```typescript
// apps/admin/src/lib/dashboards/
interface Dashboard {
  id: string;
  name: string;
  description: string;
  panels: DashboardPanel[];
  refreshInterval: number;      // seconds
  timeRange: TimeRange;
}

interface DashboardPanel {
  id: string;
  type: 'graph' | 'stat' | 'table' | 'log' | 'trace' | 'heatmap';
  title: string;
  layout: {
    x: number;
    y: number;
    w: number;
    h: number;
  };
  query: PanelQuery;
  options: Record<string, any>;
}

interface PanelQuery {
  type: 'metrics' | 'logs' | 'traces';
  promQL?: string;              // Victoria Metrics
  logQL?: string;             // Victoria Logs
  traceQL?: string;           // Victoria Traces
}
```

### Built-in Dashboards

#### 1. System Overview
| Panel | Type | Query |
|-------|------|-------|
| API RPS | Graph | `sum(rate(http_requests_total[5m]))` |
| API Latency p50/p95/p99 | Graph | `histogram_quantile(0.50, rate(http_request_duration_seconds_bucket[5m]))` |
| Error Rate | Stat | `sum(rate(http_errors_total[5m])) / sum(rate(http_requests_total[5m])) * 100` |
| Active Users | Stat | `sum(http_active_sessions)` |
| CPU Usage | Graph | `avg(rate(process_cpu_seconds_total[5m]))` |
| Memory Usage | Graph | `process_resident_memory_bytes` |

#### 2. LLM Metrics
| Panel | Type | Query |
|-------|------|-------|
| Requests/sec by Model | Graph | `sum by (model) (rate(llm_requests_total[5m]))` |
| Tokens/sec | Graph | `sum(rate(llm_tokens_total[5m]))` |
| Cost/hour | Stat | `sum(rate(llm_cost_total[1h]))` |
| Latency by Model | Heatmap | `histogram_quantile(0.95, rate(llm_latency_seconds_bucket[5m]))` |
| Model Usage Distribution | Table | `topk(10, sum by (model) (llm_requests_total))` |
| Failed Requests | Graph | `sum by (model, error) (rate(llm_errors_total[5m]))` |

#### 3. Chat Analytics
| Panel | Type | Query |
|-------|------|-------|
| Active Chats | Stat | `llm_active_chats` |
| Messages/sec | Graph | `sum(rate(chat_messages_total[5m]))` |
| Avg Response Time | Stat | `avg(chat_response_time_seconds)` |
| Messages by Role | Graph | `sum by (role) (rate(chat_messages_total[5m]))` |
| Top Chats by Messages | Table | `topk(10, chat_messages_total)` |

#### 4. Agent Execution
| Panel | Type | Query |
|-------|------|-------|
| Active Agents | Stat | `agent_executions_active` |
| Completed/min | Graph | `sum(rate(agent_executions_completed_total[5m]))` |
| Failed/min | Graph | `sum(rate(agent_executions_failed_total[5m]))` |
| Avg Steps to Complete | Stat | `avg(agent_execution_steps_total)` |
| Tool Usage | Table | `topk(10, sum by (tool) (agent_tool_calls_total))` |
| Execution Time by Agent | Heatmap | `histogram_quantile(0.95, rate(agent_execution_duration_seconds_bucket[5m]))` |

#### 5. Knowledge Base
| Panel | Type | Query |
|-------|------|-------|
| Indexed Documents | Stat | `knowledge_documents_total` |
| Search Requests/sec | Graph | `sum(rate(knowledge_search_total[5m]))` |
| Search Latency | Heatmap | `histogram_quantile(0.95, rate(knowledge_search_duration_seconds_bucket[5m]))` |
| Indexing Status | Table | `knowledge_indexing_status` |
| Storage Used | Stat | `knowledge_storage_bytes` |

#### 6. MCP Servers
| Panel | Type | Query |
|-------|------|-------|
| Active Connections | Stat | `mcp_connections_active` |
| Requests/sec | Graph | `sum(rate(mcp_requests_total[5m]))` |
| Tool Executions | Graph | `sum by (server, tool) (rate(mcp_tool_calls_total[5m]))` |
| Server Health | Table | `mcp_server_status` |
| Latency by Server | Heatmap | `histogram_quantile(0.95, rate(mcp_latency_seconds_bucket[5m]))` |

#### 7. Infrastructure
| Panel | Type | Query |
|-------|------|-------|
| Database Connections | Graph | `pg_stat_database_connections` |
| NATS Messages/sec | Graph | `sum(rate(nats_messages_total[5m]))` |
| NATS Queue Depth | Graph | `nats_queue_depth` |
| Redis Memory | Graph | `redis_memory_used_bytes` |
| Qdrant Collection Size | Graph | `qdrant_collection_points_count` |

#### 8. Logs
| Panel | Type | Query |
|-------|------|-------|
| Error Logs | Log | `level="error" | message` |
| Recent Errors | Table | `{"level":"error"} | sort by (timestamp desc) | limit 100` |
| Logs by Service | Graph | `sum by (service) (rate(logs_total[5m]))` |

#### 9. Traces
| Panel | Type | Query |
|-------|------|-------|
| Trace List | Trace | `service=llm-platform-api | sort by (timestamp desc) | limit 50` |
| Trace Duration | Heatmap | `histogram_quantile(0.95, trace_duration_seconds_bucket)` |
| Error Traces | Table | `{"status":"error"} | sort by (timestamp desc) | limit 20` |

#### 10. Audit Logs (Admin)
| Panel | Type | Query |
|-------|------|-------|
| Actions by User | Table | `audit_actions | sort by (timestamp desc) | limit 100` |
| Resource Changes | Table | `audit_resources | sort by (timestamp desc) | limit 50` |
| Failed Auth Attempts | Graph | `sum by (reason) (rate(auth_failures_total[5m]))` |

### Admin API Endpoints

```
# ============================================================================
# Configuration
# ============================================================================
GET    /api/admin/config              # System config
PATCH  /api/admin/config/:key         # Update config

# ============================================================================
# Entities Management
# ============================================================================
GET    /api/admin/entities             # List all entities
GET    /api/admin/entities/:type        # List by type
GET    /api/admin/entities/:type/:id    # Get entity
DELETE /api/admin/entities/:type/:id  # Delete entity

# ============================================================================
# Logs & Traces
# ============================================================================
GET    /api/admin/logs                # Query logs (Victoria Logs)
GET    /api/admin/traces                # Query traces (Victoria Traces)

# ============================================================================
# Metrics
# ============================================================================
GET    /api/admin/metrics              # Query metrics (Victoria Metrics)
GET    /api/admin/metrics/:name       # Get specific metric

# ============================================================================
# Audit
# ============================================================================
GET    /api/admin/audit               # Audit logs
GET    /api/admin/audit/:userId         # User audit history
```

---

## 9. Health Check Endpoints

| Service | Endpoint | Expected |
|---------|----------|----------|
| API | `GET /health` | `{"status":"ok"}` |
| Worker | `GET /health` | `{"status":"ok"}` |
| Admin | `GET /health` | `{"status":"ok"}` |
| NATS | `GET /healthz` | `{"status":"ok"}` |
| PostgreSQL | `pg_isready` | `0` |
| Redis | `redis-cli ping` | `PONG` |
| MinIO | `GET /minio/health/live` | `200` |
| Qdrant | `GET /health` | `200` |
| VictoriaMetrics | `GET /health` | `200` |

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