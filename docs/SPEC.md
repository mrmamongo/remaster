# LLM Platform — Technical Specification

---

## 2. Architecture Overview

### LiteDDD (Lite Domain-Driven Design)

LiteDDD — упрощённый DDD для монолита. Три слоя:

| Layer | Ответственность | Зависимости |
|-------|--------------|------------|
| **Domain** | Entities, Value Objects, Domain Events, Domain Services | Никаких (чистый Python) |
| **Application** | Use Cases, Commands, Queries | Domain |
| **Infrastructure** | Repositories, External APIs, NATS, S3 | Application + Domain interfaces |

**Ключевые принципы:**

1. **Make Invalid States Unrepresentable** — невалидное состояние невозможно создать
2. **Domain layer = pure business logic** — никаких external dependencies
3. **Repository pattern** — абстракция над storage в domain слое
4. **Application layer orchestrator** — use cases координируют domain operations

### DI — Dishka

Используем **Dishka** с **AsyncContainer** (first-class async). Гайд: `docs/guides/dishka_guide.md`

**Ключевые принципы:**

| Принцип | Реализация |
|---------|-----------|
| Container | `make_async_container()` — full async support |
| APP Scope | Singletons: `Config`, `NATSClient`, `QdrantClient` |
| REQUEST Scope | Per-request: `Session`, `Repositories`, `Services` |
| Cross-scope | `FromDishka()` — только вне Provider, внутри автоматически |
| FastAPI | `setup_dishka(container, app)` — auto middleware |
| Lifecycle | `container(scope=Scope.REQUEST)` для ручного управления |

### LiteDDD Code Structure

```
backend/src/
├── domain/
│   ├── users/entities.py      # User, UserStatus, UserRole, UserPreferences
│   ├── chats/entities.py    # Chat, Message, MessageRole, ToolCall
│   ├── agents/entities.py  # Agent, AgentExecution, OwnerType, ExecutionStatus
│   ├── knowledge/entities.py  # KnowledgeBase, Document, Chunk, SearchResult
│   ├── mcp/entities.py     # MCPServer, MCPAuthType
│   ├── llm/entities.py     # Model, ModelProvider, ChatRequest, ChatResponse
│   └── admin/entities.py   # SystemConfig, AuditLog
│
├── application/
│   ├── users/services.py    # Use cases
│   ├── chats/services.py
│   ├── agents/react_loop.py  # ReAct loop
│   ├── knowledge/services.py
│   ├── mcp/services.py
│   ├── llm/gateway.py     # Model gateway
│   ├── llm/router.py      # Model router
│   └── admin/services.py  # Admin service
│
└── infrastructure/
    ├── persistence/        # SQLAlchemy models + repositories
    ├── nats/               # NATS client + workers
    ├── vector/             # Qdrant client
    └── external/            # LLM APIs, Ory, S3
```

```
┌─────────────────────────────────────────────────────────────┐
│                  SvelteKit BFF (SSR + client)              │
│         (HTTP + SSE via FastStream/NATS consumer)          │
└─────────────────────┬─────────────────────────────────────┘
                       │ HTTP/SSE
┌──────────────────────▼──────────────────────────────────────┐
│                     FastAPI Monolith                        │
│  ┌────────────────────────────────────────────────────────┐  │
│  │                    API Gateway                        │  │
│  ├─────────┬─────────┬─────────┬─────────┬───────┬──────┤  │
│  │ Users   │ Chats   │ Agents  │ Knowl.  │ Admin │ MCP  │  │
│  │ Domain │ Domain  │ Domain │ Domain │Domain │Domain│  │
│  └─────────┴─────────┴─────────┴─────────┴───────┴──────┤  │
│         │                                                 │  │
│  ┌──────▼──────────────────────────────────────────────────┐  │
│  │           NATS Request-Reply (llm.inference.*)        │  │
│  └──────▼──────────────────────────────────────────────────┘  │
│  ┌─────────────────────────────────────────────────────┐    │
│  │       Agent Workers (vLLM / SGLang / Cloud)        │    │
│  │    llm.inference.{worker-id}.request              │    │
│  └─────────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────┐
│                   Infrastructure                            │
│  PostgreSQL │ Qdrant │ Redis │ Victoria │ S3/MinIO │ NATS     │
└─────────────────────────────────────────────────────────────┘
```

### Technology Stack

| Component | Technology |
|-----------|------------|
| Backend | Python 3.11+, FastAPI, FastStream |
| Message Queue | NATS (Request-Reply) |
| Database | PostgreSQL 15+ |
| Vector DB | Qdrant |
| Cache + Rate Limiting | Redis |
| Observability | Victoria Stack (Metrics + Logs + Traces) |
| File Storage | S3 (Dev: MinIO, Prod: Cloud) |
| Workflows | Temporal |
| DI | Dishka |
| AI Models | Pydantic AI |
| Frontend | SvelteKit + svelte-shadcn + TanStack Query + Axios |
| Auth | Ory Kratos + Hydra + Oathkeeper |

---

## 2. Domain Model (LiteDDD)

### Domain Structure

```
backend/src/
├── domain/           # Entities, Value Objects, Domain Events
│   ├── users/
│   ├── chats/
│   ├── agents/
│   ├── knowledge/
│   ├── mcp/
│   ├── llm/
│   └── admin/
├── application/      # Use Cases, Commands, Queries
│   ├── users/
│   ├── chats/
│   ├── agents/
│   ├── knowledge/
│   ├── mcp/
│   ├── llm/
│   └── admin/
└── infrastructure/  # Repositories, External Services, NATS
    ├── persistence/  # SQLAlchemy, Qdrant client
    ├── nats/          # FastStream publishers
    ├── external/      # Ory, LLM APIs, S3
    └── admin/          # Admin panel specific
```

---

## 3. Domain Entities

### 3.1 Users Domain

**Entity: User**

```python
class User:
    id: UUID
    ory_identity_id: str          # Kratos identity ID
    email: str
    status: UserStatus              # ACTIVE, SUSPENDED, DELETED
    role: UserRole                # ADMIN, USER, API_USER
    preferences: UserPreferences   # JSONB
    created_at: datetime
    updated_at: datetime
    deleted_at: datetime | None    # Soft delete
```

**Entity: UserGroup** (Keto integration)

```python
class UserGroup:
    id: UUID
    name: str
    parent_id: UUID | None         # Nested groups (depth ≤ 5)
    metadata: dict
    created_at: datetime
```

**Value Objects:**

- `UserPreferences` — JSONB for user settings
- `UserRole` — ADMIN, USER, API_USER

---

### 3.2 Chats Domain

**Entity: Chat**

```python
class Chat:
    id: UUID
    user_id: UUID                 # Owner
    title: str
    agent_id: UUID | None         # Associated agent
    metadata: dict                # JSONB
    created_at: datetime
    updated_at: datetime
```

**Entity: Message**

```python
class Message:
    id: UUID
    chat_id: UUID
    role: MessageRole             # USER, ASSISTANT, SYSTEM, TOOL
    content: str
    tool_calls: list[ToolCall] | None  # JSONB
    tool_call_id: str | None
    model: str | None
    usage: Usage | None            # tokens_in, tokens_out, cost
    metadata: dict               # JSONB
    created_at: datetime
```

**Value Objects:**

- `MessageRole` — USER, ASSISTANT, SYSTEM, TOOL
- `ToolCall` — id, name, arguments (JSON)
- `Usage` — tokens_in, tokens_out, cost

---

### 3.3 Agents Domain

**Entity: Agent**

```python
class Agent:
    id: UUID
    name: str
    description: str
    owner_type: OwnerType         # USER, PLATFORM, GROUP
    owner_id: UUID                # user_id / group_id
    system_prompt: str
    model_id: UUID               # LLM model
    tools: list[ToolDefinition]   # Available tools
    max_turns: int               # ReAct loop limit
    timeout_seconds: int
    metadata: dict                # JSONB
    is_active: bool
    created_at: datetime
    updated_at: datetime
```

**Entity: AgentExecution**

```python
class AgentExecution:
    id: UUID
    agent_id: UUID
    chat_id: UUID
    user_id: UUID
    status: ExecutionStatus       # PENDING, RUNNING, WAITING_HITL, PAUSED, COMPLETED, FAILED
    current_step: int
    messages: list[Message]
    result: str | None
    error: str | None
    started_at: datetime
    updated_at: datetime
    completed_at: datetime | None
```

**Value Objects:**

- `OwnerType` — USER, PLATFORM, GROUP
- `ToolDefinition` — name, description, input_schema, handler
- `ExecutionStatus` — PENDING, RUNNING, WAITING_HITL, PAUSED, COMPLETED, FAILED

**ReAct Loop Implementation:**

```
1. LLM generate thought
2. If tool_call → execute tool → result
3. LLM continue with result
4. Repeat until max_turns or final answer
5. All steps streamed via SSE
```

---

### 3.4 Knowledge Domain

**Entity: KnowledgeBase**

```python
class KnowledgeBase:
    id: UUID
    name: str
    owner_id: UUID                # User or Group
    search_methods: list[SearchMethod]  # VECTOR, BM25, HYBRID
    embedding_model_id: UUID
    reranker_model_id: UUID | None
    top_k: int
    chunk_size: int
    chunk_overlap: int
    metadata: dict                # JSONB
    is_active: bool
    created_at: datetime
    updated_at: datetime
```

**Entity: Document**

```python
class Document:
    id: UUID
    knowledge_base_id: UUID
    filename: str
    file_type: str                # pdf, txt, md, csv, etc.
    file_size: int
    s3_key: str                  # S3 path
    status: DocumentStatus        # PROCESSING, PROCESSED, FAILED
    chunk_count: int
    metadata: dict                # JSONB
    created_at: datetime
    updated_at: datetime
```

**Entity: Chunk**

```python
class Chunk:
    id: UUID
    document_id: UUID
    knowledge_base_id: UUID
    content: str
    embedding: list[float]        # Vector stored in Qdrant
    parent_id: UUID | None       # Parent chunk for hierarchical
    metadata: dict                # JSONB (position, page, etc.)
    created_at: datetime
```

**Value Objects:**

- `SearchMethod` — VECTOR, BM25, HYBRID
- `DocumentStatus` — PROCESSING, PROCESSED, FAILED

**Search Flow:**

```
1. User query → embedding model
2. Vector search in Qdrant (+ BM25 if hybrid)
3. If rerank configured → rerank top results
4. Return top_k results with source metadata
```

---

### 3.5 MCP Domain

**Entity: MCPServer**

```python
class MCPServer:
    id: UUID
    name: str
    description: str
    owner_id: UUID                # User or Group
    url: str                    # MCP server endpoint
    auth_type: MCPAuthType       # NONE, OAUTH2, API_KEY
    auth_config: dict           # JSONB (encrypted)
    tools: list[ToolDefinition]
    status: MCPServerStatus     # ACTIVE, INACTIVE, ERROR
    metadata: dict
    created_at: datetime
    updated_at: datetime
```

**Value Objects:**

- `MCPAuthType` — NONE, OAUTH2, API_KEY
- `MCPServerStatus` — ACTIVE, INACTIVE, ERROR

**Protocol:** Full MCP spec (latest version)

---

### 3.6 LLM Domain

**Entity: Model**

```python
class Model:
    id: UUID
    name: str                   # e.g., "gpt-4o", "llama-3-70b"
    provider: ModelProvider      # OPENAI, ANTHROPIC, GROQ, LOCAL
    modality: ModelModality     # CHAT, EMBEDDINGS_DENSE, EMBEDDINGS_SPARSE, EMBEDDINGS_RERANK, VISION, OCR
    endpoint: str | None       # For local models
    api_key_encrypted: str     # Infisical reference or encrypted
    config: dict               # JSONB (temperature, max_tokens, etc.)
    pricing: Pricing           # price_per_input, price_per_output
    is_active: bool
    is_default: bool
    capabilities: list[str]   # tool_call, vision, streaming
    created_at: datetime
    updated_at: datetime
```

**Entity: ModelRouter**

```python
class ModelRouter:
    # Routing rules stored in DB, configurable via Admin
    
    @staticmethod
    def select_model(
        requested_modality: ModelModality,
        user_tier: str,
        fallback_chain: list[UUID]
    ) -> Model:
        # 1. Filter by modality
        # 2. Filter by availability (is_active)
        # 3. Filter by user tier (rate limits)
        # 4. Sort by cost (cheapest first)
        # 5. Return first match or fallback
```

**Value Objects:**

- `ModelProvider` — OPENAI, ANTHROPIC, GROQ, LOCAL
- `ModelModality` — CHAT, EMBEDDINGS_DENSE, EMBEDDINGS_SPARSE, EMBEDDINGS_RERANK, VISION, OCR
- `Pricing` — price_per_input_token, price_per_output_token

**Agent Worker NATS Pattern:**

```
Request subject:  llm.inference.{worker_id}.request
Response subject: llm.inference.{worker_id}.response

Request payload:
{
    "model": "llama-3-70b",
    "messages": [...],
    "tools": [...],
    "stream": false
}
```

---

### 3.7 Admin Domain (для админ панели)

**Entity: SystemConfig**

```python
class SystemConfig:
    id: UUID
    key: str
    value: JSON
    category: ConfigCategory      # MODELS, RATE_LIMITS, FEATURES
    is_editable: bool
    description: str
    updated_at: datetime
    updated_by: UUID
```

**CRUD Operations (via Admin Panel):**

| Entity | Admin Operations |
|--------|----------------|
| Users | View, Suspend, Delete, Assign Role |
| UserGroups | Create, Edit, Delete, Manage Hierarchy |
| KnowledgeBases | Create, Edit, Delete, Manage Documents |
| MCPServers | Create, Edit, Delete, Test Connection |
| Models | Add, Edit, Deactivate, Configure |
| Agents | Create, Edit, Delete, Activate |
| SystemConfig | View, Edit (if editable) |
| AuditLogs | View, Filter, Export |
| Metrics | View (CPU, RAM, RPS, Latency) |
| Traces | View (LLM traces, Agent traces) |

**Dashboard Metrics:**

- System: CPU, RAM, Disk, Network
- Application: RPS, Latency (p50, p95, p99)
- LLM: Tokens/sec, Cost/hour, Model usage
- Users: Active users, Sessions, API calls

---

## 4. API Design

### REST Endpoints (BFF → Monolith via NATS)

```
Users:
  GET    /api/users/me
  GET    /api/users/{id}
  PATCH  /api/users/{id}
  DELETE /api/users/{id}
  POST   /api/users/{id}/groups

Groups:
  GET    /api/groups
  POST   /api/groups
  GET    /api/groups/{id}
  PATCH  /api/groups/{id}
  DELETE /api/groups/{id}
  GET    /api/groups/{id}/members

Chats:
  GET    /api/chats
  POST   /api/chats
  GET    /api/chats/{id}
  DELETE /api/chats/{id}
  GET    /api/chats/{id}/messages
  POST   /api/chats/{id}/messages    # Stream via SSE

Agents:
  GET    /api/agents
  POST   /api/agents
  GET    /api/agents/{id}
  PATCH  /api/agents/{id}
  DELETE /api/agents/{id}
  POST   /api/agents/{id}/execute    # Stream via SSE

Knowledge:
  GET    /api/knowledge-bases
  POST   /api/knowledge-bases
  GET    /api/knowledge-bases/{id}
  PATCH  /api/knowledge-bases/{id}
  DELETE /api/knowledge-bases/{id}
  POST   /api/knowledge-bases/{id}/documents
  GET    /api/knowledge-bases/{id}/search

MCP:
  GET    /api/mcp-servers
  POST   /api/mcp-servers
  GET    /api/mcp-servers/{id}
  PATCH  /api/mcp-servers/{id}
  DELETE /api/mcp-servers/{id}
  POST   /api/mcp-servers/{id}/test

Models (Admin):
  GET    /api/admin/models
  POST   /api/admin/models
  GET    /api/admin/models/{id}
  PATCH  /api/admin/models/{id}
  DELETE /api/admin/models/{id}

Metrics:
  GET    /api/admin/metrics
  GET    /api/admin/traces
  GET    /api/admin/logs
```

### Authentication Flow

```
Browser (SvelteKit):
  1. Redirect to Kratos OIDC
  2. Callback with code
  3. Exchange for tokens
  4. Store tokens in httpOnly cookie
  5. X-User-ID via Oathkeeper proxy

CLI / Desktop:
  1. Hydra OIDC device flow / authorization_code
  2. Store tokens locally
  3. Use Bearer token in requests
```

### Rate Limiting

```
- Per-user RPM (requests per minute)
- Per-group RPM (inherited)
- Per-model RPM (for cloud models)
- Token budget per month
- All via Redis sliding window
```

---

## 5. Observability

### Victoria Stack

| Component | Metric |
|-----------|--------|
| **vminsert** | Vector ingestion (logs, metrics) |
| **vmstorage** | Storage engine |
| **vmalert** | Alerting rules |
| **grafana** | Dashboards |
| **tempo** | Traces (OpenTelemetry) |

### Metrics collected

**System:**
- CPU, RAM, Disk, Network (node_exporter)

**Application:**
- HTTP RPS, Latency (p50, p95, p99)
- NATS request latency

**LLM:**
- Tokens/sec, Cost/hour
- Model availability
- API errors

**Agent:**
- Execution duration
- Tool call count
- ReAct loops used

### Alerts

- High error rate (>5%)
- High latency (>p95 > 5s)
- Model down
- Rate limit exceeded
- Disk space < 20%

---

## 6. Testing Strategy

### Test Pyramid

```
       ┌─────────────┐
       │    E2E     │  ← Playwright (few, critical paths)
       ├─────────────┤
       │ Integration │  ← TestContainers, NATS test client
       ├─────────────┤
       │    Unit    │  ← pytest (most coverage)
       └─────────────┘
```

### Test Coverage Targets

- Unit: 80%+ (domain logic, use cases)
- Integration: 50%+ (API, NATS, DB)
- E2E: Critical paths (login, chat, agent execution)

---

## 7. Deployment Checklist

- [ ] PostgreSQL + Qdrant + Redis + NATS
- [ ] Ory stack (Kratos, Hydra, Keto, Oathkeeper)
- [ ] Victoria stack (vmagent, vmstorage, grafana, tempo)
- [ ] S3/MinIO for file storage
- [ ] Temporal server
- [ ] CI/CD pipeline
- [ ] Backup strategy (PostgreSQL, Qdrant)
- [ ] Health checks (liveness, readiness)
- [ ] Rollback procedure