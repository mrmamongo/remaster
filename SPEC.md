# LLM Platform - Technical Specification

## 1. Architecture Overview

### 1.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              CLIENTS                                         │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────┐  │
│  │  Web UI  │  │ SvelteKit │  │   CLI    │  │  Desktop │  │   External   │  │
│  │          │  │   (BFF)   │  │          │  │   App    │  │   Systems    │  │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘  └──────┬───────┘  │
│       │             │             │             │               │          │
└───────┼─────────────┼─────────────┼─────────────┼───────────────┼──────────┘
        │             │             │             │               │
        ▼             ▼             ▼             ▼               ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           API GATEWAY (Kong/Traefik)                        │
│                    Rate Limiting │ Auth │ Routing                           │
└───────────────────────────────────┬─────────────────────────────────────────┘
                                    │
        ┌───────────────────────────┼───────────────────────────┐
        │                           │                           │
        ▼                           ▼                           ▼
┌───────────────┐          ┌───────────────┐          ┌───────────────┐
│   Ory Kratos  │          │   Ory Hydra   │          │   Ory Keto    │
│   (Auth/Identity)│        │ (OAuth2/OIDC)│          │  (ReBAC)      │
└───────────────┘          └───────────────┘          └───────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         CORE PLATFORM (FastAPI)                             │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                         NATS JetStream                                │   │
│  │   ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐             │   │
│  │   │ Chats    │  │  Agents  │  │   KB     │  │   MCP    │             │   │
│  │   │ Service  │  │ Service  │  │ Service  │  │ Service  │             │   │
│  │   └──────────┘  └──────────┘  └──────────┘  └──────────┘             │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │   LLM        │  │   Agent     │  │  Knowledge  │  │   Model     │        │
│  │   Engine     │  │  Executor   │  │    Base     │  │  Gateway    │        │
│  │  (PydanticAI)│  │  (ReAct)   │  │   Service   │  │  (SGL/vLLM) │        │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘        │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
        ┌───────────────────────────┼───────────────────────────┐
        │                           │                           │
        ▼                           ▼                           ▼
┌───────────────┐          ┌───────────────┐          ┌───────────────┐
│   PostgreSQL   │          │    Redis      │          │   Vector DB   │
│   (Primary)   │          │   (Cache)     │          │   (Qdrant)    │
└───────────────┘          └───────────────┘          └───────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         OBSERVABILITY STACK                                 │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────┐  │
│  │ Victoria │  │  Grafana  │  │   Loki   │  │ Promtail │  │ Alertmanager │  │
│  │ Metrics  │  │          │  │  (Logs)  │  │          │  │              │  │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘  └──────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 1.2 Technology Stack

| Layer | Technology | Version | Purpose |
|-------|------------|---------|---------|
| API Framework | FastAPI | 0.115+ | REST API |
| Message Queue | NATS | 2.10+ | Async communication |
| Stream Processing | FastStream | 0.5+ | NATS integration |
| Workflows | Temporal | 1.x+ | Task orchestration |
| DI | Dishka | 1.x | Dependency injection |
| LLM Framework | PydanticAI | 0.1+ | LLM agents |
| Database | PostgreSQL | 16+ | Primary store |
| Cache | Redis | 7.x | Sessions, cache |
| Vector DB | Qdrant / pgvector | latest | Embeddings storage |
| Auth | Ory Kratos | 1.x | Identity management |
| OAuth | Ory Hydra | 1.x | OAuth2/OIDC |
| Authorization | Ory Keto | 1.x | ReBAC |
| Frontend | SvelteKit | 2.x | Admin panel |
| UI Components | shadcn-svelte | latest | UI library |
| State Management | TanStack Query | 5.x | Server state |
| Monitoring | VictoriaMetrics | latest | Metrics |
| Logs | Loki | latest | Log aggregation |
| Alerts | Alertmanager | latest | Alerting |

### 1.3 Performance Requirements

```
Users: 1,000,000+
RPS: 500-1000 (peak 2000)
Latency (P99):
  - Chat API: < 200ms
  - LLM inference: < 30s (streaming)
  - Auth check: < 10ms
  - Permission check: < 15ms
Availability: 99.9%
```

---

## 2. Domain Model

### 2.1 Entities

```
User
├── id: UUID
├── email: str
├── ory_kratos_id: str (reference)
├── created_at: datetime
├── updated_at: datetime
└── metadata: jsonb

Group (hierarchical, max depth 5)
├── id: UUID
├── name: str
├── parent_id: UUID? (nullable, self-referencing)
├── path: str (materialized path: /company/dept/team)
├── depth: int (1-5)
├── created_at: datetime
└── metadata: jsonb

Chat
├── id: UUID
├── user_id: UUID (owner)
├── name: str
├── agent_id: UUID? (attached agent)
├── created_at: datetime
├── updated_at: datetime
└── metadata: jsonb
```

### 2.2 Message Format (AG-UI Compatible)

AG-UI compatible message types following vendor-neutral format:

```typescript
// Base message structure
interface BaseMessage {
  id: string;           // Unique identifier (UUID)
  role: MessageRole;     // Message role
  content?: string;      // Text content
  name?: string;        // Sender name
}

// Message roles
type MessageRole = 
  | "user"           // User input
  | "assistant"      // AI response
  | "system"        // System instructions
  | "tool"          // Tool execution result
  | "reasoning"     // AI reasoning (thinking)
  | "activity";     // Activity updates (PLAN, SEARCH, etc.)

// User message with multimodal support
interface UserMessage extends BaseMessage {
  role: "user";
  content: string | InputContent[];  // Text or multimodal
}

type InputContent =
  | TextInputContent      // { type: "text", text: string }
  | ImageInputContent  // { type: "image", source: { type: "url"|"data", value: string, mimeType: string } }
  | AudioInputContent
  | VideoInputContent
  | DocumentInputContent;

// Assistant message with tool calls
interface AssistantMessage extends BaseMessage {
  role: "assistant";
  content?: string;              // Text response (optional if tool calls)
  toolCalls?: ToolCall[];        // Active tool calls
  toolCallsDone?: boolean;      // All tool calls completed
}

// Tool call definition
interface ToolCall {
  id: string;               // Unique tool call ID
  name: string;             // Tool name
  arguments: string | object; // Tool arguments (JSON string or object)
}

// Tool result message
interface ToolMessage extends BaseMessage {
  role: "tool";
  content: string;         // Tool result
  toolCallId: string;     // References parent tool call
  error?: string;         // Error if failed
}

// Reasoning message (thinking visible to user)
interface ReasoningMessage extends BaseMessage {
  role: "reasoning";
  content: string;       // Reasoning text
}

// Activity message (structured updates)
interface ActivityMessage extends BaseMessage {
  role: "activity";
  activityType: string;    // e.g., "PLAN", "SEARCH", "SCRAPE"
  content: Record<string, any>;  // Structured payload
```

### 2.3 Streaming Events (SSE Format)

AG-UI SSE events for real-time streaming:

```
// Text message streaming
event: text_message_start
data: { "messageId": "msg_123", "role": "assistant" }

event: text_message_content
data: { "messageId": "msg_123", "delta": "Hello" }  // chunk append

event: text_message_content
data: { "messageId": "msg_123", "delta": " world" }

event: text_message_end
data: { "messageId": "msg_123" }

// Tool call streaming
event: tool_call_start
data: { "toolCallId": "call_abc", "toolName": "search", "parentMessageId": "msg_123" }

event: tool_call_args
data: { "toolCallId": "call_abc", "delta": "{\"query" }  // JSON fragment

event: tool_call_args
data: { "toolCallId": "call_abc", "delta": "\":\"LLM\"}" }

event: tool_call_end
data: { "toolCallId": "call_abc" }

// Reasoning streaming (if enabled)
event: reasoning_message_start
data: { "messageId": "reasoning_1" }

event: reasoning_message_content
data: { "messageId": "reasoning_1", "delta": "Let me analyze..." }

event: reasoning_message_end
data: { "messageId": "reasoning_1" }

// Message storage format (after streaming completes)
- Stored in database as: full message object with role, content, metadata
- Compatible with AG-UI serialization format
- Full history can be restored from storage
```

Agent (ReAct loop)
├── id: UUID
├── name: str
├── description: str
├── system_prompt: text
├── model_id: UUID
├── tools: list[Tool]
├── max_iterations: int
├── temperature: float
├── created_at: datetime
└── metadata: jsonb

Message (AG-UI compatible)
├── id: UUID
├── chat_id: UUID
├── role: MessageRole (user, assistant, system, tool, reasoning, activity)
├── content: text | jsonb (supports multimodal)
├── model: str
├── tool_calls: jsonb? (array of tool calls if assistant used tools)
├── tool_call_id: UUID? (for tool role messages)
├── reasoning: text? (if reasoning role)
├── activity_type: str? (if activity role)
├── tokens_used: int
├── latency_ms: int
├── created_at: datetime
└── metadata: jsonb
├── id: UUID
├── name: str
├── description: str
├── type: enum (function, mcp, http)
├── definition: jsonb (OpenAI function format)
└── is_enabled: bool

KnowledgeBase
├── id: UUID
├── name: str
├── description: str
├── owner_id: UUID
├── embedding_model_id: UUID
├── search_type: enum (semantic, hybrid, bm25)
├── chunk_size: int
├── chunk_overlap: int
├── created_at: datetime
└── metadata: jsonb

KnowledgeBaseDocument
├── id: UUID
├── knowledge_base_id: UUID
├── filename: str
├── file_path: str
├── file_size: int
├── mime_type: str
├── status: enum (pending, processing, ready, error)
├── chunks_count: int
├── embedded_at: datetime?
└── metadata: jsonb

MCPServer
├── id: UUID
├── name: str
├── description: str
├── endpoint: str (URL)
├── auth_type: enum (none, api_key, oauth)
├── auth_config: jsonb (encrypted)
├── is_enabled: bool
├── created_by: UUID
├── created_at: datetime
└── metadata: jsonb

Model
├── id: UUID
├── name: str
├── provider: enum (openai, anthropic, groq, local)
├── model_type: enum (chat, embedding, rerank, vision)
├── endpoint_url: str?
├── api_key_ref: str (secret reference)
├── is_enabled: bool
├── max_tokens: int
├── supports_streaming: bool
├── supports_function_calling: bool
├── pricing: jsonb (input/output per 1M tokens)
└── metadata: jsonb

Role
├── id: UUID
├── name: str
├── description: str
└── permissions: list[str]

UserRole
├── user_id: UUID
├── role_id: UUID
└── scope: enum (global, group, resource)

AuditLog
├── id: UUID
├── user_id: UUID
├── action: str
├── resource_type: str
├── resource_id: UUID
├── old_value: jsonb?
├── new_value: jsonb?
├── ip_address: str
├── user_agent: str
└── created_at: datetime

ServiceAccount
├── id: UUID
├── name: str
├── user_id: UUID (owner)
├── group_id: UUID? (if belongs to group)
├── secret_hash: str (bcrypt)
├── scopes: list[str]
├── rate_limit_rpm: int
├── rate_limit_tpm_daily: int
├── is_active: bool
├── last_used_at: datetime?
├── expires_at: datetime?
├── created_at: datetime
└── metadata: jsonb

ServiceAccountAuditLog
├── id: UUID
├── service_account_id: UUID
├── action: str
├── resource_type: str
├── resource_id: UUID?
├── ip_address: str
├── user_agent: str
└── created_at: datetime

MCPTool
├── id: UUID
├── mcp_server_id: UUID
├── name: str
├── description: str
├── input_schema: jsonb
└── metadata: jsonb

MCPToolUsageLog
├── id: UUID
├── mcp_tool_id: UUID
├── user_id: UUID
├── service_account_id: UUID?
├── status: enum (success, error)
├── latency_ms: int
├── error_message: str?
└── created_at: datetime

AgentWorkflow (Temporal)
├── id: UUID
├── name: str
├── description: str
├── workflow_type: enum (simple, chain, parallel, conditional)
├── definition: jsonb (Temporal workflow definition)
├── input_schema: jsonb
├── output_schema: jsonb
├── is_active: bool
├── created_at: datetime
└── metadata: jsonb

AgentWorkflowExecution
├── id: UUID
├── workflow_id: UUID
├── user_id: UUID
├── status: enum (pending, running, completed, failed, cancelled)
├── input: jsonb
├── output: jsonb?
├── error: str?
├── started_at: datetime
├── completed_at: datetime?
└── metadata: jsonb

AgentWorkflowExecutionLog
├── id: UUID
├── execution_id: UUID
├── step: int
├── step_name: str
├── status: enum (pending, running, completed, failed)
├── input: jsonb
├── output: jsonb?
├── error: str?
├── started_at: datetime
└── completed_at: datetime?

AgentWorkflowMetrics
├── id: UUID
├── workflow_id: UUID
├── date: date
├── total_executions: int
├── successful_executions: int
├── failed_executions: int
├── avg_duration_ms: int
└── p95_duration_ms: int
```

### 2.2 Relationships (ReBAC)

```
# Ownership
chat:{chat_id}@owner@user:{user_id}
chat:{chat_id}@member@user:{user_id}

# Knowledge Base Access
kb:{kb_id}@owner@user:{user_id}
kb:{kb_id}@editor@user:{user_id}
kb:{kb_id}@viewer@user:{user_id}
kb:{kb_id}@viewer@group:{group_id}

# Agent Access
agent:{agent_id}@owner@user:{user_id}
agent:{agent_id}@executor@user:{user_id}
agent:{agent_id}@executor@group:{group_id}

# MCP Server Access
mcp:{mcp_id}@admin@user:{user_id}
mcp:{mcp_id}@user@group:{group_id}

# Model Access
model:{model_id}@user@role:{role_id}

# Group Hierarchy
group:{group_id}@parent@group:{parent_id}
group:{group_id}@member@user:{user_id}
```

---

## 3. API Design

### 3.1 NATS Subjects Structure

```
# User management
user.>
# user.create, user.update, user.delete, user.login, user.logout

# Chat & Messages
chat.>
# chat.create, chat.update, chat.delete, chat.list
message.>
# message.create, message.send (streaming)

# Agents
agent.>
# agent.create, agent.update, agent.delete, agent.execute, agent.list

# Knowledge Base
kb.>
# kb.create, kb.update, kb.delete, kb.search, kb.ingest

# MCP
mcp.>
# mcp.connect, mcp.disconnect, mcp.execute

# Models
model.>
# model.register, model.update, model.health

# System
system.>
# system.health, system.metrics
```

### 3.2 REST API Endpoints (BFF)

```
# Auth (via Ory)
POST   /auth/login
POST   /auth/logout
GET    /auth/me
POST   /auth/register

# Users
GET    /api/users
GET    /api/users/{id}
PATCH  /api/users/{id}
DELETE /api/users/{id}

# Groups
GET    /api/groups
GET    /api/groups/{id}
POST   /api/groups
PATCH  /api/groups/{id}
DELETE /api/groups/{id}
GET    /api/groups/{id}/members
POST   /api/groups/{id}/members
DELETE /api/groups/{id}/members/{user_id}

# Chats
GET    /api/chats
GET    /api/chats/{id}
POST   /api/chats
PATCH  /api/chats/{id}
DELETE /api/chats/{id}

# Messages
GET    /api/chats/{chat_id}/messages
POST   /api/chats/{chat_id}/messages
GET    /api/chats/{chat_id}/messages/{id}
DELETE /api/chats/{chat_id}/messages/{id}

# Agents
GET    /api/agents
GET    /api/agents/{id}
POST   /api/agents
PATCH  /api/agents/{id}
DELETE /api/agents/{id}
POST   /api/agents/{id}/execute

# Knowledge Base
GET    /api/kb
GET    /api/kb/{id}
POST   /api/kb
PATCH  /api/kb/{id}
DELETE /api/kb/{id}
POST   /api/kb/{id}/documents
DELETE /api/kb/{id}/documents/{doc_id}
POST   /api/kb/{id}/search

# MCP Servers
GET    /api/mcp
GET    /api/mcp/{id}
POST   /api/mcp
PATCH  /api/mcp/{id}
DELETE /api/mcp/{id}
POST   /api/mcp/{id}/test

# Models
GET    /api/models
GET    /api/models/{id}
POST   /api/models
PATCH  /api/models/{id}
DELETE /api/models/{id}

# Admin
GET    /api/admin/users
GET    /api/admin/groups
GET    /api/admin/agents
GET    /api/admin/kb
GET    /api/admin/mcp
GET    /api/admin/models

# Observability
GET    /api/admin/logs
GET    /api/admin/metrics
GET    /api/admin/traces

# LLM Traces (specific)
GET    /api/admin/llm-traces
GET    /api/admin/llm-traces/{id}

# Service Accounts
GET    /api/admin/service-accounts
GET    /api/admin/service-accounts/{id}
POST   /api/admin/service-accounts
PATCH  /api/admin/service-accounts/{id}
DELETE /api/admin/service-accounts/{id}
POST   /api/admin/service-accounts/{id}/rotate-secret

# Agent Workflows
GET    /api/admin/agent-workflows
GET    /api/admin/agent-workflows/{id}
POST   /api/admin/agent-workflows
PATCH  /api/admin/agent-workflows/{id}
DELETE /api/admin/agent-workflows/{id}
GET    /api/admin/agent-workflows/{id}/executions
GET    /api/admin/agent-workflows/executions/{execution_id}
GET    /api/admin/agent-workflows/executions/{execution_id}/logs

# User Logs (per user, all service accounts they have access to)
GET    /api/admin/users/{user_id}/audit-logs
GET    /api/admin/users/{user_id}/service-account-logs
```

---

## 4. Component Specifications

### 4.1 LLM Engine

```
┌─────────────────────────────────────────────────────────────────┐
│                      LLM Engine Service                        │
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │   PydanticAI  │  │   Retry      │  │   Circuit    │         │
│  │   Agent       │  │   Handler    │  │   Breaker    │         │
│  └──────┬───────┘  └──────────────┘  └──────────────┘         │
│         │                                                     │
│  ┌──────┴───────┐  ┌──────────────┐  ┌──────────────┐         │
│  │   Model      │  │   Token       │  │   Guardrails │         │
│  │   Router     │  │   Pool        │  │   (Input/Out)│         │
│  └──────────────┘  └──────────────┘  └──────────────┘         │
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │   Rate        │  │   Budget     │  │   Tracing    │         │
│  │   Limiter     │  │   Tracker    │  │   (OpenAI)   │         │
│  └──────────────┘  └──────────────┘  └──────────────┘         │
└─────────────────────────────────────────────────────────────────┘
```

### 4.2 Agent (ReAct Loop)

```
┌─────────────────────────────────────────────────────────────────┐
│                     ReAct Agent Loop                            │
│                                                                  │
│  ┌─────────┐     ┌─────────┐     ┌─────────┐     ┌─────────┐ │
│  │  Think  │────▶│  Plan   │────▶│  Action │────▶│ Observe │ │
│  └─────────┘     └─────────┘     └─────────┘     └────┬────┘ │
│       ▲                                              │        │
│       │                                              │        │
│       └──────────────────────────────────────────────┘        │
│                      (max_iterations)                          │
└─────────────────────────────────────────────────────────────────┘

Step:
1. Think: Analyze context, decide if more steps needed
2. Plan: Select tool/response based on available actions
3. Action: Execute tool call or generate response
4. Observe: Parse tool result, update context
5. If tool_used: Add to message history, loop
6. If final_answer: Return to user
```

### 4.3 Knowledge Base Service

```
┌─────────────────────────────────────────────────────────────────┐
│                  Knowledge Base Service                         │
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │   Ingest     │  │   Chunk      │  │   Embed      │         │
│  │   Pipeline   │─▶│   Strategy   │─▶│   (Model)    │         │
│  └──────────────┘  └──────────────┘  └──────┬───────┘         │
│                                               │                 │
│  ┌──────────────┐  ┌──────────────┐  ┌───────┴───────┐         │
│  │   Search     │  │   Hybrid     │  │   Vector      │         │
│  │   (Query)    │◀─│   (BM25+Emb) │◀─│   Store       │         │
│  └──────┬───────┘  └──────────────┘  └───────────────┘         │
│         │                                                      │
│  ┌──────┴───────┐  ┌──────────────┐                            │
│  │   Re-rank    │  │   Context    │                            │
│  │   (Cross-enc)│─▶│   Builder    │                            │
│  └──────────────┘  └──────────────┘                            │
└─────────────────────────────────────────────────────────────────┘
```

### 4.4 Rate Limiting Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                   Rate Limiting Layer                           │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                    Redis Counters                         │  │
│  │   user:{user_id}:requests:minutely  (600 req/min)        │  │
│  │   user:{user_id}:tokens:daily       (1M tokens/day)      │  │
│  │   user:{user_id}:budget:monthly    ($1000/month)         │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
│  Limits per tier:                                                │
│  ┌─────────┬────────────┬──────────┬───────────┐               │
│  │  Tier   │  RPM       │  TPM/Day │  $/Month │               │
│  ├─────────┼────────────┼──────────┼───────────┤               │
│  │ Free    │ 10         │ 100K     │ $0        │               │
│  │ Pro     │ 100        │ 1M       │ $50       │               │
│  │ Team    │ 500        │ 10M      │ $500      │               │
│  │ Enterprise│ Unlimited │ Unlimited │ Custom   │               │
│  └─────────┴────────────┴──────────┴───────────┘               │
└─────────────────────────────────────────────────────────────────┘
```

---

## 5. Security

### 5.1 Authentication Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                  Authentication Flow                            │
│                                                                  │
│  1. User ──▶ POST /auth/login ──▶ Ory Kratos                   │
│                    │                                            │
│                    ▼                                            │
│  2. Kratos validates credentials                                 │
│                    │                                            │
│                    ▼                                            │
│  3. Return session token (Ory Kratos)                          │
│                                                                  │
│  4. Client ──▶ API Request + Bearer Token                       │
│                    │                                            │
│                    ▼                                            │
│  5. Gateway validates token with Kratos                        │
│                    │                                            │
│                    ▼                                            │
│  6. Request + user_id ──▶ Keto (check permission)              │
│                                                                  │
│  7. Allow/Deny ──▶ Process request                              │
└─────────────────────────────────────────────────────────────────┘
```

### 5.2 OAuth2 / OIDC (for external clients)

```
┌─────────────────────────────────────────────────────────────────┐
│                  OAuth2 Flow (Ory Hydra)                       │
│                                                                  │
│  CLI/Desktop App ──▶ OAuth2 Authorization Code Flow            │
│                                                                  │
│  1. Client ──▶ /oauth2/auth (authorize)                        │
│  2. User login via Kratos                                       │
│  3. Consent screen                                              │
│  4. Return authorization code                                   │
│  5. Client ──▶ /oauth2/token (exchange code)                   │
│  6. Return access_token + refresh_token                         │
│                                                                  │
│  Scopes:                                                        │
│  - chat:read, chat:write                                        │
│  - agent:execute                                                │
│  - kb:read, kb:write                                           │
│  - admin:*                                                      │
└─────────────────────────────────────────────────────────────────┘
```

---

## 6. Observability

### 6.1 Metrics

```
┌─────────────────────────────────────────────────────────────────┐
│                      Metrics Stack                              │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                 VictoriaMetrics                          │   │
│  │                                                           │   │
│  │  Application Metrics:                                    │   │
│  │  - api_request_total{endpoint, method, status}          │   │
│  │  - api_request_duration_seconds{endpoint}              │   │
│  │  - active_connections{service}                          │   │
│  │  - nats_message_total{subject, action}                  │   │
│  │                                                           │   │
│  │  LLM Metrics:                                            │   │
│  │  - llm_request_total{model, provider}                   │   │
│  │  - llm_tokens_total{model, direction}                   │   │
│  │  - llm_latency_seconds{model}                           │   │
│  │  - llm_error_total{model, error_type}                   │   │
│  │  - llm_cost_total{model}                                │   │
│  │                                                           │   │
│  │  Business Metrics:                                       │   │
│  │  - active_users_total                                    │   │
│  │  - chat_messages_total                                   │   │
│  │  - agent_executions_total{status}                       │   │
│  │  - kb_documents_total{kb_id}                            │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

### 6.2 Tracing

```
┌─────────────────────────────────────────────────────────────────┐
│                     Distributed Tracing                         │
│                                                                  │
│  Trace spans:                                                   │
│                                                                  │
│  [HTTP Request]                                                 │
│     │                                                           │
│     ├─▶ [Auth Check] ──▶ Kratos                                 │
│     │                                                           │
│     ├─▶ [Permission Check] ──▶ Keto                            │
│     │                                                           │
│     ├─▶ [Database Query]                                        │
│     │                                                           │
│     ├─▶ [NATS Publish]                                          │
│     │                                                           │
│     │    [Async: Agent Execution]                              │
│     │         │                                                  │
│     │         ├─▶ [LLM: Think] ──▶ Model Gateway               │
│     │         │                                                  │
│     │         ├─▶ [LLM: Tool Call] ──▶ Tool Service           │
│     │         │                                                  │
│     │         └─▶ [LLM: Final Response] ──▶ Model Gateway      │
│     │                                                           │
│     └─▶ [Response]                                              │
│                                                                  │
│  Tools: OpenTelemetry → Tempo/Grafana                          │
└─────────────────────────────────────────────────────────────────┘
```

### 6.3 Logs

```
┌─────────────────────────────────────────────────────────────────┐
│                        Log Structure                            │
│                                                                  │
│  JSON format with fields:                                       │
│  {                                                              │
│    "timestamp": "2025-01-01T12:00:00Z",                        │
│    "level": "INFO",                                            │
│    "service": "chat-service",                                  │
│    "trace_id": "abc123",                                       │
│    "user_id": "user-456",                                      │
│    "action": "message.send",                                   │
│    "resource_type": "chat",                                    │
│    "resource_id": "chat-789",                                  │
│    "duration_ms": 150,                                         │
│    "status": "success",                                        │
│    "error": null                                                │
│  }                                                              │
│                                                                  │
│  Collected via: Vector → Loki                                   │
└─────────────────────────────────────────────────────────────────┘
```

### 6.4 Alerting

```
┌─────────────────────────────────────────────────────────────────┐
│                      Alert Rules                                │
│                                                                  │
│  Critical (PagerDuty):                                          │
│  - service_down{service="llm-gateway"}                         │
│  - high_error_rate{rate="5m"} > 5%                             │
│  - database_down                                                │
│  - nats_connection_failed                                       │
│                                                                  │
│  Warning (Slack):                                               │
│  - high_latency_p99 > 5s                                       │
│  - rate_limit_near_limit > 80%                                 │
│  - disk_space < 10%                                             │
│  - memory_usage > 85%                                           │
│                                                                  │
│  Info (Email):                                                  │
│  - user_signup_spike                                            │
│  - new_agent_created                                            │
│  - model_added                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 7. Admin Panel

### 7.1 Pages Structure

```
/admin
├── /dashboard
│   ├── Stats cards (users, chats, agents, models)
│   ├── Activity chart
│   └── Quick actions
│
├── /users
│   ├── User list (search, filter, pagination)
│   ├── User detail (edit, roles, groups)
│   └── User create
│
├── /groups
│   ├── Group tree (hierarchical view)
│   ├── Group detail (members, children)
│   └── Group create/edit
│
├── /agents
│   ├── Agent list (status, owner)
│   ├── Agent detail (edit, test)
│   ├── Agent create
│   └── Agent logs/traces
│
├── /knowledge-bases
│   ├── KB list
│   ├── KB detail (documents, config)
│   ├── KB create/edit
│   └── Document viewer
│
├── /mcp-servers
│   ├── Server list
│   ├── Server detail (test connection)
│   └── Server create/edit
│
├── /models
│   ├── Model list (provider, status)
│   ├── Model detail (config, health)
│   ├── Model create/edit
│   └── Model logs
│
├── /roles
│   ├── Role list
│   ├── Role create/edit
│   └── Permission matrix
│
├── /settings
│   ├── Platform settings
│   ├── Feature flags
│   └── Integration configs
│
├── /logs
│   ├── Log viewer (filterable)
│   ├── Log search
│   └── Export
│
├── /mcp-tools
│   ├── Tool list (per server)
│   ├── Tool usage logs
│   └── Tool testing
│
├── /service-accounts
│   ├── Account list
│   ├── Account detail (permissions, usage)
│   ├── Account create/edit
│   └── Account logs
│
├── /agent-workflows
│   ├── Workflow list
│   ├── Workflow detail (definition, executions)
│   ├── Workflow create/edit
│   ├── Execution history
│   ├── Execution logs (per step)
│   └── Execution metrics
│
├── /users/{id}/logs
│   ├── User audit logs
│   └── Service account access logs
│
├── /metrics
│   ├── System metrics (CPU, memory, disk)
│   ├── API metrics
│   ├── LLM metrics
│   └── Custom dashboards
│
└── /traces
    ├── Trace list
    ├── Trace detail
    └── LLM trace viewer (chat-like visualization)
```

### 7.2 Tech Stack

```
Frontend: SvelteKit 2.x (BFF pattern)
├── shadcn-svelte (UI components)
├── TanStack Query (server state)
├── Axios (HTTP client)
└── TailwindCSS (styling)

BFF Layer: SvelteKit API routes
├── Auth via Ory Kratos
├── Proxy to core NATS/FastAPI
└── Data transformation
```

---

## 8. Model Gateway

### 8.1 Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Model Gateway Service                        │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                    API Layer                             │   │
│  │   OpenAI-compatible /v1/chat/completions                │   │
│  │   OpenAI-compatible /v1/embeddings                      │   │
│  │   OpenAI-compatible /v1/models                          │   │
│  └──────────────────────────┬─────────────────────────────┘   │
│                             │                                    │
│  ┌──────────────────────────┴─────────────────────────────┐   │
│  │                   Router                                  │   │
│  │   - Route by model ID                                     │   │
│  │   - Fallback handling                                     │   │
│  │   - Load balancing                                        │   │
│  └──────────────────────────┬─────────────────────────────┘   │
│                             │                                    │
│  ┌────────────┐  ┌─────────┴────────┐  ┌────────────┐         │
│  │  Cloud     │  │   Local          │  │  Embedding  │         │
│  │  Providers │  │   (SGLang/vLLM) │  │   Models    │         │
│  │            │  │                  │  │             │         │
│  │ - OpenAI   │  │ - Llama          │  │ - nomic     │         │
│  │ - Anthropic│  │ - Qwen           │  │ - bge       │         │
│  │ - Groq     │  │ - Mistral        │  │ - e5        │         │
│  └────────────┘  └──────────────────┘  └────────────┘         │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │              Auto-provisioning (future)                  │   │
│  │   - Kubernetes operator for SGLang/vLLM                 │   │
│  │   - GPU allocation on demand                             │   │
│  │   - Health monitoring                                    │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

### 8.2 Deployment Options

```
Infrastructure:
- 3x servers with 4x NVIDIA RTX 6000 (24 GPUs total)
- 2x AMD EPYC processors per server
- Total: ~150GB VRAM for inference
- Network: 100GbE between servers

Local Models (Phase 1):
├── SGLang single-node (per GPU)
├── vLLM single-node (per GPU)
└── Manual deployment via Docker Compose

Auto-provisioning (Phase 2):
├── Kubernetes operator (future)
├── Helm charts
├── GPU scheduling
└── Auto-scaling policies
```

---

## 9. Testing Strategy

### 9.1 Test Pyramid

```
┌─────────────────────────────────────────────────────────────────┐
│                        Test Pyramid                             │
│                                                                  │
│                    ┌───────────────┐                             │
│                    │     E2E       │  ~50 tests                 │
│                    │   (Cypress)   │                            │
│                    └───────┬───────┘                            │
│                    ┌───────┴───────┐                            │
│                    │   Integration │  ~200 tests                │
│                    │    (pytest)   │                            │
│                    └───────┬───────┘                            │
│                    ┌───────┴───────┐                            │
│                    │     Unit      │  ~500 tests                │
│                    │    (pytest)   │                            │
│                    └───────────────┘                            │
│                                                                  │
│  Coverage targets:                                               │
│  - Unit: 80%+                                                   │
│  - Integration: 70%+                                           │
│  - E2E: Critical paths                                          │
└─────────────────────────────────────────────────────────────────┘
```

### 9.2 Test Types

```
Unit Tests:
├── Domain models validation
├── Service logic
├── Permission checks
├── Rate limiting logic
└── Data transformations

Integration Tests:
├── API endpoints
├── NATS message flows
├── Database operations
├── Ory integration (Kratos, Hydra, Keto)
└── External API mocks (OpenAI, Anthropic)

E2E Tests:
├── User login flow
├── Chat with agent
├── Knowledge base search
├── Admin CRUD operations
└── OAuth2 flow
```

---

## 10. Implementation Phases

### Phase 1: Foundation (4 weeks)
- [ ] Infrastructure setup (Docker Compose / K8s)
- [ ] PostgreSQL schema + migrations
- [ ] Redis cluster
- [ ] NATS JetStream setup
- [ ] Ory stack deployment (Kratos, Hydra, Keto)

### Phase 2: Core Platform (6 weeks)
- [ ] FastAPI application structure
- [ ] Dishka DI setup
- [ ] User management API
- [ ] Group management API
- [ ] Chat & Message API
- [ ] Authentication flow

### Phase 3: LLM Engine (4 weeks)
- [ ] PydanticAI integration
- [ ] Model gateway (basic routing)
- [ ] ReAct agent implementation
- [ ] Tool system
- [ ] Rate limiting
- [ ] Guardrails (input/output)

### Phase 4: Knowledge Base (4 weeks)
- [ ] Document ingestion pipeline
- [ ] Chunking strategies
- [ ] Embedding pipeline
- [ ] Vector store integration (Qdrant)
- [ ] Search API
- [ ] Hybrid search

### Phase 5: MCP Integration (3 weeks)
- [ ] MCP protocol support
- [ ] Server management
- [ ] Tool registration
- [ ] Audit logging
- [ ] Permission checks

### Phase 6: Admin Panel (4 weeks)
- [ ] SvelteKit setup
- [ ] shadcn-svelte integration
- [ ] CRUD pages for all entities
- [ ] Log viewer
- [ ] Metrics dashboard
- [ ] Trace viewer

### Phase 7: Observability (3 weeks)
- [ ] VictoriaMetrics setup
- [ ] Grafana dashboards
- [ ] Loki log aggregation
- [ ] Alert rules
- [ ] LLM tracing

### Phase 8: Production Ready (2 weeks)
- [ ] Load testing
- [ ] Security audit
- [ ] Performance tuning
- [ ] Documentation
- [ ] Runbooks

---

## 11. Open Questions (ANSWERED)

### Infrastructure

| Question | Answer |
|----------|--------|
| GPU Infrastructure | On-premise DC, 3 servers with 4x RTX 6000 each + 2x AMD EPYC |
| Cloud vs Local | 100% local (for now), preparing for gateway mode |
| Data Retention | 1 year |

### Multi-Tenancy

| Question | Answer |
|----------|--------|
| Architecture | Multi-tenant by departments/groups |
| Isolation | Each department = separate group hierarchy in Keto |

### Misc

| Question | Answer |
|----------|--------|
| Migration | No existing code to migrate |
| Compliance | TBD if needed |

---

*Last Updated: 2025-01-20*
*Version: 1.0*
