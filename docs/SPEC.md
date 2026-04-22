# LLM Platform — Technical Specification

---

## 1. Architecture Overview

### Technology Stack

| Component | Technology |
|-----------|------------|
| **Backend** | TypeScript 5+, NestJS 10+ |
| **Message Queue** | NATS (via @nestjs/microservices) |
| **Database** | PostgreSQL 15+ (via Prisma) |
| **Vector DB** | Qdrant |
| **Cache + Rate Limiting** | Redis |
| **Observability** | Victoria Stack (Metrics + Logs + Traces) |
| **File Storage** | S3 (Dev: MinIO, Prod: Cloud) |
| **Workflows** | Temporal |
| **AI Models** | Mastra (formerly Composio) |
| **Frontend** | SvelteKit + svelte-shadcn + TanStack Query |
| **Auth** | Ory Kratos + Hydra + Oathkeeper + Keto |

---

## 2. LiteDDD (Lite Domain-Driven Design)

LiteDDD — упрощённый DDD с явным разделением слоёв и **интеракторами** для бизнес-логики.

### Layer Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│ PRESENTATION Layer (Controllers)                                  │
│ • Request/Response mapping                                       │
│ • HTTP streaming (SSE)                                           │
│ • Error formatting                                               │
│ • THIS IS WHERE PRESENTATION LOGIC LIVES                         │
└──────────────────────────────────────────────────────────────────┘
                              ↓
┌──────────────────────────────────────────────────────────────────┐
│ APPLICATION Layer (CQRS Handlers)                                 │
│ • Commands and Queries                                           │
│ • Dispatch ONLY — NO business logic                             │
└──────────────────────────────────────────────────────────────────┘
                              ↓
┌──────────────────────────────────────────────────────────────────┐
│ DOMAIN Layer (Interactors + Entities)                            │
│ • Business logic in Interactors                                  │
│ • Entities with domain rules                                     │
│ • Domain Events                                                  │
│ • NO knowledge of HTTP, streaming, or presentation              │
└──────────────────────────────────────────────────────────────────┘
                              ↓
┌──────────────────────────────────────────────────────────────────┐
│ INFRASTRUCTURE Layer (Repositories + External Services)          │
│ • Database access (Prisma)                                       │
│ • External APIs (Ory, LLM, S3)                                   │
│ • Caching (Redis)                                                │
└──────────────────────────────────────────────────────────────────┘
```

### Key Principles

1. **Handler = Dispatch only** — handlers call interactors, no logic
2. **Interactor = One use case** — all business logic
3. **Presentation stays in Controller** — mapping, streaming, HTTP
4. **Domain = Pure TypeScript** — no external dependencies
5. **Repository pattern** — abstraction over storage

### Code Structure

```
apps/api/src/
├── main.ts                    # Entry point
├── app.module.ts              # Root module
│
├── common/                    # Shared (guards, filters, interceptors)
│   ├── guards/
│   ├── filters/
│   └── interceptors/
│
├── config/                    # Configuration
│   └── configuration.ts
│
├── chat/                      # Chat Domain (example)
│   ├── chat.module.ts         # NestJS module
│   ├── chat.controller.ts    # PRESENTATION — HTTP, streaming, mapping
│   ├── handlers.ts           # APPLICATION — CQRS dispatch only
│   ├── interactors/          # DOMAIN — business logic
│   │   └── chat.interactors.ts
│   ├── entities/             # DOMAIN — domain entities
│   │   └── chat.entity.ts
│   ├── repositories/         # INFRASTRUCTURE — repository interface
│   │   └── chat-repo.interface.ts
│   ├── dto/                  # Input/Output DTOs
│   │   ├── index.ts
│   │   └── responses.ts
│   ├── events/               # DOMAIN — domain events
│   │   └── chat.events.ts
│   └── index.ts             # Public API
│
├── agent/                    # Agent Domain
├── knowledge/               # Knowledge Base Domain
├── mcp/                     # MCP Gateway Domain
├── model/                    # Model Management Domain
├── workflow/                # Workflow Domain
├── admin/                   # Admin Domain
│
├── database/                # Infrastructure — Prisma
├── nats/                    # Infrastructure — NATS
├── auth/                    # Infrastructure — Ory integration
└── llm/                     # Infrastructure — LLM gateway
```

### NestJS Modules

Each domain is a self-contained NestJS module with:
- Controller (presentation)
- Handlers (CQRS dispatch)
- Interactors (business logic)
- Entities (domain model)
- Repositories (data access interface)
- Events (domain events)

---

## 3. Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                 SvelteKit BFF (SSR + client)                │
│           (HTTP + SSE via @nestjs/microservices)            │
└─────────────────────┬─────────────────────────────────────┘
                       │ HTTP/SSE
┌──────────────────────▼──────────────────────────────────────┐
│                     NestJS Monolith                        │
│  ┌────────────────────────────────────────────────────────┐ │
│  │                    API Gateway                         │ │
│  ├─────────┬─────────┬─────────┬─────────┬───────┬──────┤ │
│  │ Users   │ Chats   │ Agents  │ Knowl.  │ Admin │ MCP  │ │
│  │ Module  │ Module  │ Module  │ Module  │Module │Module│ │
│  │         │         │         │         │       │      │ │
│  └─────────┴─────────┴─────────┴─────────┴───────┴──────┘ │
│                       │                                       │
│  ┌────────────────────▼──────────────────────────────────────┐ │
│  │              NATS Request-Reply                            │ │
│  │              llm.inference.*                               │ │
│  └───────────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │         LLM Workers (SGLang / vLLM / Cloud)                │ │
│  │         Mastra for agent orchestration                     │ │
│  └────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│                    Infrastructure                             │
│  PostgreSQL │ Qdrant │ Redis │ Victoria │ S3/MinIO │ NATS    │
└─────────────────────────────────────────────────────────────┘
```

---

## 4. LiteDDD Pattern — Implementation

### File Responsibilities

| File | Layer | Responsibility |
|------|-------|----------------|
| `*.controller.ts` | Presentation | HTTP, streaming, mapping |
| `handlers.ts` | Application | CQRS dispatch only |
| `interactors/*.ts` | Domain | Business logic |
| `entities/*.ts` | Domain | Domain entities |
| `repositories/*.ts` | Infrastructure | Data access |
| `dto/*.ts` | All | Data transfer objects |

### Handler Template (Application Layer)

```typescript
// handlers.ts — CQRS dispatch ONLY
@Injectable()
export class CreateChatHandler implements ICommandHandler<CreateChatCommand, Chat> {
  constructor(
    private readonly createChatInteractor: CreateChatInteractor,
  ) {}

  async execute(command: CreateChatCommand): Promise<Chat> {
    // NO LOGIC — only call interactor
    return this.createChatInteractor.execute(command.input);
  }
}
```

### Interactor Template (Domain Layer)

```typescript
// interactors/chat.interactors.ts — ALL BUSINESS LOGIC
export interface CreateChatInput {
  userId: string;
  name: string;
  agentId?: string;
}

@Injectable()
export class CreateChatInteractor {
  constructor(
    private readonly chatRepository: ChatRepository,
    private readonly eventBus: EventBus,
  ) {}

  async execute(input: CreateChatInput): Promise<Chat> {
    // 1. Business validation
    // 2. Entity creation
    // 3. Repository save
    // 4. Event publishing
    // NO HTTP knowledge, NO streaming
  }
}
```

### Controller Template (Presentation Layer)

```typescript
// chat.controller.ts — PRESENTATION ONLY
@Controller('chats')
export class ChatController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Post()
  async create(@Body() dto: CreateChatDto, @Req() req: Request) {
    const userId = this.extractUserId(req);
    
    // Call CQRS handler
    const result = await this.commandBus.execute(
      new CreateChatCommand({ userId, name: dto.name, agentId: dto.agentId }),
    );

    // PRESENTATION: Map to API response format
    return this.toChatResponse(result);
  }

  // Streaming handled HERE, not in interactor
  @Post(':id/messages')
  async sendMessage(@Param('id') id: string, @Body() dto: any, @Res() res: Response) {
    if (dto.stream) {
      return this.handleStreaming(id, dto, res); // PRESENTATION logic
    }
    // ...
  }
}
```

---

## 5. Domain Entities

### 5.1 Users Domain

```typescript
interface User {
  id: string;                  // UUID
  oryIdentityId: string;       // Kratos identity ID
  email: string;
  displayName: string;
  status: 'ACTIVE' | 'SUSPENDED' | 'DELETED';
  role: 'ADMIN' | 'USER' | 'API_USER';
  preferences: Record<string, any>;  // JSONB
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;       // Soft delete
}

interface UserGroup {
  id: string;
  name: string;
  parentId: string | null;     // Nested groups (depth ≤ 5)
  metadata: Record<string, any>;
  createdAt: Date;
}
```

### 5.2 Chats Domain

```typescript
interface Chat {
  id: string;
  userId: string;              // Owner
  name: string;
  agentId: string | null;       // Associated agent
  createdAt: Date;
  updatedAt: Date;
  metadata: Record<string, any>;
}

interface Message {
  id: string;
  chatId: string;
  role: 'user' | 'assistant' | 'system' | 'tool' | 'reasoning' | 'activity';
  content: string | Record<string, any>;
  toolCalls: ToolCall[] | null;
  toolCallId: string | null;
  model: string | null;
  usage: Usage | null;
  metadata: Record<string, any>;
  createdAt: Date;
}

interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, any>;
}

interface Usage {
  inputTokens: number;
  outputTokens: number;
  cost: number;
}
```

### 5.3 Agents Domain

```typescript
interface Agent {
  id: string;
  name: string;
  description: string;
  ownerType: 'USER' | 'PLATFORM' | 'GROUP';
  ownerId: string;
  systemPrompt: string;
  modelId: string;
  tools: ToolDefinition[];
  maxTurns: number;
  timeoutSeconds: number;
  isActive: boolean;
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

interface AgentExecution {
  id: string;
  agentId: string;
  chatId: string;
  userId: string;
  status: 'PENDING' | 'RUNNING' | 'WAITING_HITL' | 'PAUSED' | 'COMPLETED' | 'FAILED';
  currentStep: number;
  result: string | null;
  error: string | null;
  startedAt: Date;
  completedAt: Date | null;
}
```

### 5.4 Knowledge Domain

```typescript
interface KnowledgeBase {
  id: string;
  name: string;
  ownerId: string;
  searchMethods: ('VECTOR' | 'BM25' | 'HYBRID')[];
  embeddingModelId: string;
  rerankerModelId: string | null;
  topK: number;
  chunkSize: number;
  chunkOverlap: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface Document {
  id: string;
  knowledgeBaseId: string;
  filename: string;
  fileType: string;
  fileSize: number;
  s3Key: string;
  status: 'PROCESSING' | 'PROCESSED' | 'FAILED';
  chunkCount: number;
  metadata: Record<string, any>;
  createdAt: Date;
}

interface Chunk {
  id: string;
  documentId: string;
  knowledgeBaseId: string;
  content: string;
  embedding: number[];        // Vector in Qdrant
  metadata: Record<string, any>;
  createdAt: Date;
}
```

### 5.5 MCP Domain

```typescript
interface MCPServer {
  id: string;
  name: string;
  ownerId: string;
  url: string;
  authType: 'NONE' | 'OAUTH2' | 'API_KEY';
  authConfig: Record<string, any>;  // Encrypted
  tools: ToolDefinition[];
  status: 'ACTIVE' | 'INACTIVE' | 'ERROR';
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}
```

### 5.6 Model Domain

```typescript
interface Model {
  id: string;
  name: string;                // e.g., "gpt-4o", "llama-3-70b"
  provider: 'OPENAI' | 'ANTHROPIC' | 'GROQ' | 'LOCAL';
  modality: 'CHAT' | 'EMBEDDINGS' | 'RERANK' | 'VISION';
  endpoint: string | null;
  apiKeyRef: string;           // Encrypted reference
  config: Record<string, any>;
  pricing: {
    inputPer1M: number;
    outputPer1M: number;
  };
  isActive: boolean;
  isDefault: boolean;
  capabilities: string[];
  createdAt: Date;
  updatedAt: Date;
}
```

### 5.7 Admin Domain

```typescript
interface SystemConfig {
  id: string;
  key: string;
  value: any;
  category: 'MODELS' | 'RATE_LIMITS' | 'FEATURES';
  isEditable: boolean;
  description: string;
  updatedAt: Date;
  updatedBy: string;
}

interface AuditLog {
  id: string;
  userId: string;
  action: string;
  resource: string;
  resourceId: string;
  details: Record<string, any>;
  createdAt: Date;
}
```

---

## 6. API Design

### REST Endpoints

```
# Users
GET    /api/users/me
GET    /api/users/:id
PATCH  /api/users/:id

# Groups
GET    /api/groups
POST   /api/groups
GET    /api/groups/:id
PATCH  /api/groups/:id
DELETE /api/groups/:id

# Chats
GET    /api/chats
POST   /api/chats
GET    /api/chats/:id
PATCH  /api/chats/:id
DELETE /api/chats/:id
GET    /api/chats/:id/messages
POST   /api/chats/:id/messages        # SSE streaming
DELETE /api/chats/:id/messages

# Agents
GET    /api/agents
POST   /api/agents
GET    /api/agents/:id
PATCH  /api/agents/:id
DELETE /api/agents/:id
POST   /api/agents/:id/execute

# Knowledge Bases
GET    /api/knowledge
POST   /api/knowledge
GET    /api/knowledge/:id
PATCH  /api/knowledge/:id
DELETE /api/knowledge/:id
POST   /api/knowledge/:id/documents
GET    /api/knowledge/:id/search

# MCP Servers
GET    /api/mcp
POST   /api/mcp
GET    /api/mcp/:id
PATCH  /api/mcp/:id
DELETE /api/mcp/:id
POST   /api/mcp/:id/test
POST   /api/mcp/:id/tools/:toolName/execute

# Models
GET    /api/models
POST   /api/models
GET    /api/models/:id
PATCH  /api/models/:id
DELETE /api/models/:id

# Admin
GET    /api/admin/config
PATCH  /api/admin/config/:key
GET    /api/admin/audit-logs
GET    /api/admin/metrics
GET    /api/admin/traces
```

### NATS Request-Reply

```
llm.inference.{workerId}.request   → LLM inference request
llm.inference.{workerId}.response  ← LLM inference response

llm.embedding.request              → Embedding request
llm.embedding.response             ← Embedding response

llm.rerank.request                 → Rerank request
llm.rerank.response                ← Rerank response
```

---

## 7. ReBAC with Ory Keto

### Permission Structure

```
# Ownership
chat:{chatId}@owner@user:{userId}
agent:{agentId}@owner@user:{userId}
knowledge:{kbId}@owner@user:{userId}

# Access Control
chat:{chatId}@member@user:{userId}
knowledge:{kbId}@editor@group:{groupId}
mcp:{serverId}@admin@user:{userId}

# Group Hierarchy
group:{childId}@parent@group:{parentId}
```

### Max Depth: 5 levels

---

## 8. Observability Stack

```
┌─────────────────────────────────────────────────────────────┐
│                    Victoria Stack                            │
├─────────────┬────────────────┬─────────────────────────────┤
│ Victoria    │ Loki            │ Tempo (Grafana)              │
│ Metrics     │ Logs            │ Traces (OpenTelemetry)      │
│ Prometheus  │ (via Vector)    │ Jaeger-compatible           │
└─────────────┴────────────────┴─────────────────────────────┘
                           │
                    ┌──────▼──────┐
                    │   Grafana   │
                    │  Dashboards │
                    └─────────────┘
```

### Metrics

- **System**: CPU, RAM, Disk, Network
- **Application**: RPS, Latency (p50, p95, p99), Error rate
- **LLM**: Tokens/sec, Cost/hour, Model usage distribution
- **Users**: Active users, Sessions, API calls

### Tracing

- OpenTelemetry integration
- LLM tracing with spans for prompts, completions, token usage
- Agent execution traces with tool calls
- Distributed tracing across NATS

---

## 9. Frontend Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     SvelteKit BFF                            │
│               (SvelteKit as API proxy)                       │
│                                                              │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │                 Server Side (SSR)                        │ │
│  │  • Initial page load                                     │ │
│  │  • Server-side data fetching                            │ │
│  │  • Auth session management                              │ │
│  └─────────────────────────────────────────────────────────┘ │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │                 Client Side                              │ │
│  │  • TanStack Query for data fetching                     │ │
│  │  • SSE for real-time streaming                          │ │
│  │  • svelte-shadcn components                             │ │
│  └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                           │
                    HTTP + SSE
                           │
              ┌────────────▼────────────┐
              │   NestJS API Gateway     │
              │   (this backend)         │
              └─────────────────────────┘
```

### Packages

| Package | Version | Purpose |
|---------|---------|---------|
| @sveltejs/kit | ^2.0 | SvelteKit framework |
| svelte-shadcn | latest | UI components |
| @tanstack/svelte-query | ^5 | Data fetching |
| axios | ^1.6 | HTTP client |

---

## 10. Deployment

### Container Structure

```
docker-compose.yml
├── api (NestJS application)
├── worker (LLM worker with SGLang/vLLM)
├── vector (Qdrant)
├── queue (NATS)
├── cache (Redis)
├── db (PostgreSQL)
├── storage (MinIO for dev, S3 for prod)
├── observability (Victoria Stack)
└── infra (Ory services)
```

### Infrastructure

- 3 servers × 4× RTX 6000 Ada
- 2× AMD EPYC (~150GB VRAM total)
- Kubernetes for orchestration
- Terraform for IaC