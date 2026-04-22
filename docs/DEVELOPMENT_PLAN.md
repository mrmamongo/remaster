# Development Plan

---

## Phase 0: Infrastructure Setup (Week 1-2)

**Goal:** Поднять Docker Compose с Ory Stack, PostgreSQL, NATS, Redis, Qdrant, Victoria

### Tasks

| # | Task | Dependencies | Estimate |
|---|------|-------------|----------|
| 0.1 | Docker Compose с PostgreSQL, NATS, Redis, MinIO, Qdrant | - | 4h |
| 0.2 | Ory Stack: Kratos + Keto + Hydra + Oathkeeper | 0.1 | 8h |
| 0.3 | Victoria Stack: Metrics + Logs + Traces | 0.1 | 4h |
| 0.4 | SvelteKit frontend skeleton | 0.1 | 4h |
| 0.5 | NestJS API skeleton | 0.1 | 4h |
| 0.6 | Health check endpoints для всех сервисов | 0.2, 0.3, 0.5 | 4h |
| 0.7 | GitHub Actions CI/CD для API | 0.5 | 4h |

**Deliverable:** Работающий Docker Compose со всеми сервисами

---

## Phase 1: Core Domain — Users & Auth (Week 2-3)

**Goal:** Аутентификация через Kratos, авторизация через Keto, базовые CRUD для пользователей

### Tasks

| # | Task | Dependencies | Estimate |
|---|------|-------------|----------|
| 1.1 | Prisma schema: User, UserGroup | - | 4h |
| 1.2 | NestJS модуль users с LiteDDD | - | 8h |
| 1.3 | Интеграция Kratos identity provider | 0.2 | 8h |
| 1.4 | Keto ReBAC для owner/member/editor | 0.2 | 8h |
| 1.5 | JWT middleware + Guards | 1.3 | 4h |
| 1.6 | User Groups CRUD (nested до 5) | 1.1, 1.4 | 8h |
| 1.7 | Тесты: юниты + интеграция | 1.1-1.6 | 16h |

**Deliverable:** Users API с Kratos auth и Keto permissions

---

## Phase 2: Core Domain — Models & LLM Gateway (Week 3-4)

**Goal:** Конфигурация моделей, интеграция с OpenAI/Anthropic/Groq, NATS для inference

### Tasks

| # | Task | Dependencies | Estimate |
|---|------|-------------|----------|
| 2.1 | Prisma schema: Model | - | 2h |
| 2.2 | NatsClientModule (NestJS) | 0.1 | 4h |
| 2.3 | NATS subjects: llm.inference.* | 2.2 | 4h |
| 2.4 | LLM Gateway: OpenAI client | 2.2 | 8h |
| 2.5 | LLM Gateway: Anthropic client | 2.2 | 8h |
| 2.6 | LLM Gateway: Groq client | 2.2 | 8h |
| 2.7 | NATS worker для inference | 2.2 | 8h |
| 2.8 | Rate limiting для LLM | 1.5, 2.7 | 4h |
| 2.9 | Тесты: mock LLM, интеграция | 2.3-2.8 | 16h |

**Deliverable:** LLM Gateway с NATS queue

---

## Phase 3: Core Domain — Chats & Messages (Week 4-5)

**Goal:** Чаты с сообщениями, SSE streaming, файлы

### Tasks

| # | Task | Dependencies | Estimate |
|---|------|-------------|----------|
| 3.1 | Prisma schema: Chat, Message, File | - | 4h |
| 3.2 | Chat CRUD LiteDDD | - | 8h |
| 3.3 | Message CRUD | 3.2 | 8h |
| 3.4 | SSE streaming endpoint | 2.7, 3.3 | 8h |
| 3.5 | File upload to MinIO | 3.3 | 8h |
| 3.6 | Chat permissions (owner/member) | 1.4, 3.2 | 4h |
| 3.7 | Тесты: чаты, сообщения, SSE | 3.2-3.6 | 16h |

**Deliverable:** Chat API с streaming

---

## Phase 4: Core Domain — Agents (Week 5-6)

**Goal:** ReAct agent с tool calling, Mastra integration

### Tasks

| # | Task | Dependencies | Estimate |
|---|------|-------------|----------|
| 4.1 | Prisma schema: Agent | - | 4h |
| 4.2 | Agent CRUD | - | 8h |
| 4.3 | MCP Tool Definition schema | - | 4h |
| 4.4 | Tool calling engine | 4.3 | 8h |
| 4.5 | ReAct loop implementation | 2.7, 4.4 | 16h |
| 4.6 | Agent execution via NATS | 4.5 | 8h |
| 4.7 | HITL (Human In The Loop) pause | 4.6 | 8h |
| 4.8 | Тесты: ReAct loop, tools | 4.2-4.7 | 16h |

**Deliverable:** Agent API с ReAct execution

---

## Phase 5: Core Domain — Knowledge Base (Week 6-7)

**Goal:** Векторный поиск через Qdrant, BM25, hybrid search

### Tasks

| # | Task | Dependencies | Estimate |
|---|------|-------------|----------|
| 5.1 | Prisma schema: KnowledgeBase, Document, Chunk | - | 4h |
| 5.2 | Qdrant client module | 0.1 | 4h |
| 5.3 | Document chunking pipeline | 5.1 | 8h |
| 5.4 | Embedding generation | 2.7, 5.3 | 8h |
| 5.5 | Qdrant index/search | 5.2, 5.4 | 8h |
| 5.6 | BM25 search (PostgreSQL) | 5.1 | 8h |
| 5.7 | Hybrid search (vector + BM25) | 5.5, 5.6 | 8h |
| 5.8 | Reranking | 2.7 | 8h |
| 5.9 | Тесты: indexing, search | 5.3-5.8 | 16h |

**Deliverable:** Knowledge Base API

---

## Phase 6: Core Domain — MCP Servers (Week 7-8)

**Goal:** MCP server management, tool discovery, execution

### Tasks

| # | Task | Dependencies | Estimate |
|---|------|-------------|----------|
| 6.1 | Prisma schema: MCPServer | - | 4h |
| 6.2 | MCP Server CRUD | - | 8h |
| 6.3 | MCP discovery protocol | 6.2 | 8h |
| 6.4 | MCP tool execution engine | 4.4, 6.3 | 8h |
| 6.5 | MCP OAuth2/API Key auth | 6.3 | 8h |
| 6.6 | MCP connection pooling | 6.4 | 8h |
| 6.7 | Тесты: MCP integration | 6.2-6.6 | 16h |

**Deliverable:** MCP Server management API

---

## Phase 7: Core Domain — Workflows (Week 8-9)

**Goal:** Prefect workflows для автоматизации

### Tasks

| # | Task | Dependencies | Estimate |
|---|------|-------------|----------|
| 7.1 | Prefect server setup | 0.1 | 4h |
| 7.2 | Workflow schema (Prisma) | - | 4h |
| 7.3 | Workflow CRUD | - | 8h |
| 7.4 | Prefect flow: KB indexing | 5.3 | 8h |
| 7.5 | Prefect flow: Agent scheduled | 4.6 | 8h |
| 7.6 | Prefect flow: LLM batch | 2.7 | 8h |
| 7.7 | Тесты: workflows | 7.2-7.6 | 16h |

**Deliverable:** Workflow API и Prefect flows

---

## Phase 8: Admin Panel (Week 9-10)

**Goal:** Grafana-like dashbords в SvelteKit

### Tasks

| # | Task | Dependencies | Estimate |
|---|------|-------------|----------|
| 8.1 | SvelteKit admin skeleton | 0.4 | 4h |
| 8.2 | Dashboard layout + components | - | 8h |
| 8.3 | Victoria Metrics queries | 0.3 | 8h |
| 8.4 |Victoria Logs queries | 0.3 | 8h |
| 8.5 | Victoria Traces queries | 0.3 | 8h |
| 8.6 | Dashboard: System Overview | 8.3 | 8h |
| 8.7 | Dashboard: LLM Metrics | 8.3 | 8h |
| 8.8 | Dashboard: Agents & KB | 8.3 | 8h |
| 8.9 | Dashboard: Infrastructure | 8.3 | 8h |
| 8.10 | Dashboard: Audit Logs | 1.6 | 8h |

**Deliverable:** Admin Panel с 10 dashboards

---

## Phase 9: DevOps & Production (Week 10-12)

**Goal:** K3s, monitoring, alerts, production readiness

### Tasks

| # | Task | Dependencies | Estimate |
|---|------|-------------|----------|
| 9.1 | K3s manifests | 0.1-0.7 | 16h |
| 9.2 | Terraform IaC | 9.1 | 16h |
| 9.3 | AlertManager integration | 0.3 | 8h |
| 9.4 | Prometheus alerting rules | 9.3 | 8h |
| 9.5 | Auto-scaling K3s | 9.1 | 8h |
| 9.6 | Backup/restore scripts | 0.1 | 8h |
| 9.7 | Load testing (k6) | Phase 1-8 | 16h |
| 9.8 | Security audit | Phase 1-8 | 16h |

**Deliverable:** Production-ready K3s deployment

---

## Timeline

```
Week:    1  2  3  4  5  6  7  8  9  10 11 12
Phase:   ←0→ ←1→ ←2→ ←3→ ←4→ ←5→ ←6→ ←7→ ←8→ ←9→
         ████████████████████████████████████████
```

---

## Dependencies Map

```
Phase 0 ─────┬────── Phase 1 ─────┬────── Phase 3 ─────┬── Phase 8
             │                    │
             │    Phase 2 ──────┼──────────────────┘
             │
             │    Phase 4 ──────┼──────────────────┬── Phase 7
             │                    │                │
             │    Phase 5 ───────┼────────────────┘
             │
             │    Phase 6 ──────┘
```

---

## Test Coverage Target

| Phase | Unit Tests | Integration Tests | E2E |
|-------|----------|----------------|-----|
| 1 | 80% | 10 | 2 |
| 2 | 80% | 15 | 5 |
| 3 | 80% | 15 | 5 |
| 4 | 80% | 15 | 5 |
| 5 | 80% | 15 | 3 |
| 6 | 80% | 10 | 3 |
| 7 | 80% | 10 | 2 |
| 8 | 80% | 10 | 5 |
| 9 | 90% | 20 | 10 |

---

## Key Milestones

| Milestone | Phase | Дата | Definition of Done |
|----------|-------|------|------|----------------|
| M0 | 0 | Week 2 | Docker Compose running |
| M1 | 1 | Week 3 | Users + Auth working |
| M2 | 2 | Week 4 | LLM inference OK |
| M3 | 3 | Week 5 | Chats + streaming OK |
| M4 | 4 | Week 6 | Agents OK |
| M5 | 5 | Week 7 | Knowledge base OK |
| M6 | 6 | Week 8 | MCP servers OK |
| M7 | 7 | Week 9 | Workflows OK |
| M8 | 8 | Week 10 | Admin OK |
| M9 | 9 | Week 12 | Production ready |