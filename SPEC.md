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
│                         NESTJS API LAYER                                     │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                         NATS JetStream                                │   │
│  │   ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐             │   │
│  │   │  Chats   │  │  Agents   │  │   KB     │  │   MCP    │             │   │
│  │   │ Service  │  │ Service   │  │ Service  │  │ Service  │             │   │
│  │   └──────────┘  └──────────┘  └──────────┘  └──────────┘             │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │    LLM     │  │    Agent    │  │ Knowledge   │  │    Model    │        │
│  │   Engine   │  │  Executor   │  │    Base     │  │   Gateway   │        │
│  │  (Mastra)  │  │  (ReAct)    │  │  Service   │  │ (SGL/vLLM)  │        │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘        │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
        ┌───────────────────────────┼───────────────────────────┐
        │                           │                           │
        ▼                           ▼                           ▼
┌───────────────┐          ┌───────────────┐          ┌───────────────┐
│   PostgreSQL  │          │    Redis      │          │   Vector DB   │
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
└────────────────────────────────────────────────────────────────────���─��──────┘
```

### 1.2 Technology Stack (TypeScript Monorepo)

| Layer | Technology | Version | Purpose |
|-------|------------|---------|---------|
| API Framework | NestJS | 11.x | REST API, DI, CQRS |
| Message Queue | NATS | 2.10+ | Async communication |
| Stream Processing | node-nats | 2.x | NATS integration |
| Workflows | Temporal | 1.x+ | Task orchestration |
| DI | NestJS Built-in | - | Dependency injection |
| LLM Framework | Mastra | 0.2.x | LLM agents, tools |
| Database | PostgreSQL | 16+ | Primary store |
| ORM | Prisma / Drizzle | latest | Database access |
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

### 1.3 Monorepo Structure

```
llm-platform/
├── apps/
│   ├── api              # NestJS API Gateway
│   │   ├── src/
│   │   │   ├── main.ts
│   │   │   ├── app.module.ts
│   │   │   ├── config/
│   │   │   ├── common/        # Guards, Interceptors, Filters
│   │   │   ├── database/      # Prisma/Drizzle
│   │   │   ├── nats/          # NATS clients
│   │   │   ├── auth/          # Ory integration
│   │   │   ├── chat/         # Chat domain
│   │   │   ├── agent/         # Agent domain
│   │   │   ├── knowledge/     # Knowledge base domain
│   │   │   ├── mcp/           # MCP domain
│   │   │   ├── model/        # Model management
│   │   │   ├── workflow/     # Temporal workflows
│   │   │   └── admin/        # Admin endpoints
│   │   └── test/
│   ├── worker          # Background worker (Temporal)
│   ├── frontend        # SvelteKit Public UI
│   └── admin           # SvelteKit Admin Panel
├── packages/
│   ├── types           # Shared TypeScript types
│   │   └── src/
│   │       ├── entities/       # Entity interfaces
│   │       ├── dto/           # DTOs
│   │       └── events/       # NATS event types
│   ├── config          # Shared configuration
│   │   └── src/
│   │       └── config.schema.ts
│   ├── ui              # Shared UI components (Shadcn)
│   │   └── src/
│   │       └── components/
│   ├── mastra-tools   # Custom Mastra tools
│   │   └── src/
│   │       ├── knowledge.ts
│   │       ├── mcp.ts
│   │       └── workflow.ts
│   └── testing        # Test utilities
│       └── src/
│           ├── mocks/
│           └── fixtures/
├── scripts/            # Build, deploy, migration scripts
├── docker/             # Dockerfiles, docker-compose
├── k8s/               # Kubernetes manifests
└── turbo.json         # Turborepo config
```

### 1.4 Performance Requirements

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

```typescript
// packages/types/src/entities/

User
├── id: UUID
├── email: string
├── oryKratosId: string (reference)
├── createdAt: Date
├── updatedAt: Date
└── metadata: Record<string, any>

Group (hierarchical, max depth 5)
├── id: UUID
├── name: string
├── parentId: UUID | null (self-referencing)
├── path: string (materialized path: /company/dept/team)
├── depth: number (1-5)
├── createdAt: Date
└── metadata: Record<string, any>

Chat
├── id: UUID
├── userId: UUID (owner)
├── name: string
├── agentId: UUID | null (attached agent)
├── createdAt: Date
├── updatedAt: Date
└── metadata: Record<string, any>
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
  | ImageInputContent    // { type: "image", source: { type: "url"|"data", value: string, mimeType: string } }
  | AudioInputContent
  | VideoInputContent
  | DocumentInputContent;

// Assistant message with tool calls
interface AssistantMessage extends BaseMessage {
  role: "assistant";
  content?: string;              // Text response (optional if tool calls)
  toolCalls?: ToolCall[];      // Active tool calls
  toolCallsDone?: boolean;    // All tool calls completed
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
```

### 2.4 Core Entities

```typescript
// Agent (ReAct loop)
Agent
├── id: UUID
├── name: string
├── description: string
├── systemPrompt: string
├── modelId: UUID
├── tools: Tool[]
├── maxIterations: number
├── temperature: number
├── createdAt: Date
└── metadata: Record<string, any>

// Message (AG-UI compatible)
Message
├── id: UUID
├── chatId: UUID
├── role: MessageRole (user, assistant, system, tool, reasoning, activity)
├── content: string | Record<string, any>
├── model: string
├── toolCalls: ToolCall[] | null
├── toolCallId: UUID | null
├── reasoning: string | null
├── activityType: string | null
├── tokensUsed: number
├── latencyMs: number
├── createdAt: Date
└── metadata: Record<string, any>

// Tool
Tool
├── id: UUID
├── name: string
├── description: string
├── type: ToolType (function, mcp, http)
├── definition: Record<string, any> (OpenAI function format)
└── isEnabled: boolean

// KnowledgeBase
KnowledgeBase
├── id: UUID
├── name: string
├── description: string
├── ownerId: UUID
├── embeddingModelId: UUID
├── searchType: SearchType (semantic, hybrid, bm25)
├── chunkSize: number
├── chunkOverlap: number
├── createdAt: Date
└── metadata: Record<string, any>

// KnowledgeBaseDocument
KnowledgeBaseDocument
├── id: UUID
├── knowledgeBaseId: UUID
├── filename: string
├── filePath: string
├── fileSize: number
├── mimeType: string
├── status: DocumentStatus (pending, processing, ready, error)
├── chunksCount: number
├── embeddedAt: Date | null
└── metadata: Record<string, any>

// MCPServer
MCPServer
├── id: UUID
├── name: string
├── description: string
├── endpoint: string (URL)
├── authType: AuthType (none, api_key, oauth)
├── authConfig: Record<string, any> (encrypted)
├── isEnabled: boolean
├── createdBy: UUID
├── createdAt: Date
└── metadata: Record<string, any>

// Model
Model
├── id: UUID
├── name: string
├── provider: ModelProvider (openai, anthropic, groq, local)
├── modelType: ModelType (chat, embedding, rerank, vision)
├── endpointUrl: string | null
├── apiKeyRef: string (secret reference)
├── isEnabled: boolean
├── maxTokens: number
├── supportsStreaming: boolean
├── supportsFunctionCalling: boolean
├── pricing: Record<string, any> (input/output per 1M tokens)
└── metadata: Record<string, any>

// Role
Role
├── id: UUID
├── name: string
├── description: string
└── permissions: string[]

// UserRole
UserRole
├── userId: UUID
├── roleId: UUID
└── scope: Scope (global, group, resource)

// AuditLog
AuditLog
├── id: UUID
├── userId: UUID
├── action: string
├── resourceType: string
├── resourceId: UUID
├── oldValue: Record<string, any> | null
├── newValue: Record<string, any> | null
├── ipAddress: string
├── userAgent: string
└── createdAt: Date

// ServiceAccount
ServiceAccount
├── id: UUID
├── name: string
├── userId: UUID (owner)
├── groupId: UUID | null (if belongs to group)
├── secretHash: string (bcrypt)
├── scopes: string[]
├── rateLimitRpm: number
├── rateLimitTpmDaily: number
��── isActive: boolean
├── lastUsedAt: Date | null
├── expiresAt: Date | null
├── createdAt: Date
└── metadata: Record<string, any>

// ServiceAccountAuditLog
ServiceAccountAuditLog
├── id: UUID
├── serviceAccountId: UUID
├── action: string
├── resourceType: string
├── resourceId: UUID | null
├── ipAddress: string
├── userAgent: string
└── createdAt: Date

// MCPTool
MCPTool
├── id: UUID
├── mcpServerId: UUID
├── name: string
├── description: string
├── inputSchema: Record<string, any>
└── metadata: Record<string, any>

// MCPToolUsageLog
MCPToolUsageLog
├── id: UUID
├── mcpToolId: UUID
├── userId: UUID
├── serviceAccountId: UUID | null
├── status: UsageStatus (success, error)
├── latencyMs: number
├── errorMessage: string | null
└── createdAt: Date

// AgentWorkflow (Temporal)
AgentWorkflow
├── id: UUID
├── name: string
├── description: string
├── workflowType: WorkflowType (simple, chain, parallel, conditional)
├── definition: Record<string, any> (Temporal workflow definition)
├── inputSchema: Record<string, any>
├── outputSchema: Record<string, any>
├── isActive: boolean
├── createdAt: Date
└── metadata: Record<string, any>

// AgentWorkflowExecution
AgentWorkflowExecution
├── id: UUID
├── workflowId: UUID
├── userId: UUID
├── status: ExecutionStatus (pending, running, completed, failed, cancelled)
├── input: Record<string, any>
├── output: Record<string, any> | null
├── error: string | null
├── startedAt: Date
├── completedAt: Date | null
└── metadata: Record<string, any>

// AgentWorkflowExecutionLog
AgentWorkflowExecutionLog
├── id: UUID
├── executionId: UUID
├── step: number
├── stepName: string
├── stepStatus: StepStatus (pending, running, completed, failed)
├── input: Record<string, any>
├── output: Record<string, any> | null
├── error: string | null
├── startedAt: Date
└── completedAt: Date | null

// AgentWorkflowMetrics
AgentWorkflowMetrics
├── id: UUID
├── workflowId: UUID
├── date: Date
├── totalExecutions: number
├── successfulExecutions: number
├── failedExecutions: number
├── avgDurationMs: number
└── p95DurationMs: number
```

### 2.5 Relationships (ReBAC)

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
# agent.create, agent.update, agent.delete, agent.execute, agent.execution.>

# Knowledge Base
kb.>
# kb.create, kb.update, kb.delete, kb.search, kb.document.>

# MCP
mcp.>
# mcp.create, mcp.connect, mcp.tools, mcp.execute

# Models
model.>
# model.list, model.validate, model.health

# Workflows
workflow.>
# workflow.start, workflow.cancel, workflow.status

# Admin
admin.>
# admin.metrics, admin.logs, admin.config
```

### 3.2 API Endpoints (REST)

```
# Authentication
POST   /auth/login          # Login via credentials
POST   /auth/register      # Register new user
POST   /auth/logout       # Logout
POST   /auth/refresh     # Refresh token
GET    /auth/me          # Current user

# Chats
GET    /chats            # List user's chats
POST   /chats            # Create new chat
GET    /chats/:id        # Get chat details
PATCH  /chats/:id        # Update chat
DELETE /chats/:id        # Delete chat
POST   /chats/:id/clear  # Clear chat messages

# Messages
GET    /chats/:id/messages     # List messages in chat
POST   /chats/:id/messages    # Send message (non-streaming)
GET    /chats/:id/stream      # Send message (streaming SSE)

# Agents
GET    /agents              # List available agents
POST   /agents              # Create new agent
GET    /agents/:id          # Get agent details
PATCH  /agents/:id          # Update agent
DELETE /agents/:id          # Delete agent
POST   /agents/:id/execute   # Execute agent manually

# Knowledge Bases
GET    /knowledge-bases              # List knowledge bases
POST   /knowledge-bases              # Create knowledge base
GET    /knowledge-bases/:id          # Get KB details
PATCH  /knowledge-bases/:id         # Update KB
DELETE /knowledge-bases/:id          # Delete KB

# Knowledge Base Documents
GET    /knowledge-bases/:id/documents           # List documents
POST   /knowledge-bases/:id/documents           # Upload document
GET    /knowledge-bases/:id/documents/:docId      # Get document
DELETE /knowledge-bases/:id/documents/:docId   # Delete document
POST   /knowledge-bases/:id/documents/:docId/reembed  # Re-embed document

# MCP Servers
GET    /mcp-servers              # List MCP servers
POST   /mcp-servers              # Create MCP server
GET    /mcp-servers/:id          # Get server details
PATCH  /mcp-servers/:id         # Update server
DELETE /mcp-servers/:id          # Delete server
POST   /mcp-servers/:id/test     # Test connection

# MCP Tools
GET    /mcp-servers/:id/tools     # List available tools
POST   /mcp-servers/:id/tools/execute  # Execute tool

# Models
GET    /models              # List models
POST   /models            # Add new model
GET    /models/:id        # Get model details
PATCH  /models/:id        # Update model
DELETE /models/:id        # Delete model

# Workflows
GET    /workflows              # List workflows
POST   /workflows              # Create workflow
GET    /workflows/:id          # Get workflow details
PATCH  /workflows/:id         # Update workflow
DELETE /workflows/:id          # Delete workflow
POST   /workflows/:id/execute  # Execute workflow
GET    /workflows/:id/executions  # List executions

# Service Accounts
GET    /service-accounts              # List service accounts
POST   /service-accounts              # Create service account
GET    /service-accounts/:id          # Get account details
PATCH  /service-accounts/:id         # Update account
DELETE /service-accounts/:id          # Delete account
POST   /service-accounts/:id/rotate  # Rotate secret
POST   /service-accounts/:id/revoke   # Revoke account

# Admin Endpoints

# Users Management
GET    /admin/users              # List all users
GET    /admin/users/:id        # Get user details
PATCH  /admin/users/:id      # Update user
DELETE /admin/users/:id      # Delete user
GET    /admin/users/:id/logs  # Get user audit logs

# Groups Management
GET    /admin/groups              # List groups
POST   /admin/groups              # Create group
GET    /admin/groups/:id          # Get group details
PATCH  /admin/groups/:id        # Update group
DELETE /admin/groups/:id        # Delete group

# Roles & Permissions
GET    /admin/roles              # List roles
POST   /admin/roles              # Create role
GET    /admin/roles/:id        # Get role details
PATCH  /admin/roles/:id        # Update role
DELETE /admin/roles/:id        # Delete role

# System Configuration
GET    /admin/config              # Get configuration
PATCH  /admin/config             # Update configuration

# Observability
GET    /admin/metrics            # System metrics
GET    /admin/metrics/llm        # LLM-specific metrics
GET    /admin/traces             # Distributed traces
GET    /admin/logs               # Application logs
GET    /admin/logs/search        # Search logs
GET    /admin/health             # Health check

# Model Gateway
GET    /admin/gateway/models     # List deployed models
POST   /admin/gateway/deploy    # Deploy new model
POST   /admin/gateway/:id/scale # Scale model instance
DELETE /admin/gateway/:id        # Undeploy model
```

---

## 4. Mastra Integration

### 4.1 Agent Setup with Mastra

```typescript
// packages/mastra-tools/src/agents/realtime-agent.ts
import { Agent, createAgent } from 'mastra';
import { openai } from 'ai-extra'; // or use mastra's built-in

const realtimeAgent = createAgent({
  name: 'RealtimeAgent',
  model: openai('gpt-4o'),
  system: `You are a helpful AI assistant...`,
  tools: {
    knowledgeSearch: createKnowledgeSearchTool(kbService),
    mcpTool: createMCPTool(mcpService),
    // ... custom tools
  },
  maxSteps: 10,
});
```

### 4.2 Custom Tools for Mastra

```typescript
// packages/mastra-tools/src/tools/knowledge.ts
export function createKnowledgeSearchTool(kbService: KnowledgeBaseService) {
  return {
    name: 'knowledge_search',
    description: 'Search knowledge base for relevant information',
    schema: z.object({
      query: z.string(),
      knowledgeBaseId: z.string(),
      limit: z.number().default(5),
    }),
    execute: async ({ query, knowledgeBaseId, limit }) => {
      const results = await kbService.search(knowledgeBaseId, query, { limit });
      return { results };
    },
  };
}
```

---

## 5. Observability

### 5.1 Metrics

```
# Application Metrics (prom-client)
- http_requests_total
- http_request_duration_seconds
- nats_messages_total
- nats_message_duration_seconds

# Business Metrics
- chats_created_total
- messages_sent_total
- agents_executed_total
- kb_queries_total

# LLM Metrics
- llm_requests_total
- llm_requests_duration_seconds
- llm_tokens_used_total
- llm_errors_total

# Agent Metrics
- agent_iterations_total
- agent_tools_called_total
- agent_errors_total

# Workflow Metrics
- workflow_executions_total
- workflow_duration_seconds
- workflow_failures_total
```

### 5.2 Logs Structure

```json
{
  "timestamp": "2024-01-15T10:30:00Z",
  "level": "INFO",
  "service": "api",
  "traceId": "abc123",
  "spanId": "def456",
  "userId": "user_123",
  "action": "chat.message.send",
  "durationMs": 150,
  "message": "Message sent successfully"
}
```

### 5.3 Tracing Spans

```
# Spans
- http.request (incoming HTTP request)
- nats.publish (NATS message publish)
- nats.subscribe (NATS message handling)
- llm.request (LLM API call)
- agent.step (ReAct loop iteration)
- tool.execution (Tool execution)
- kb.search (Knowledge base search)
- db.query (Database query)
```

---

## 6. Security

### 6.1 Authentication Flow

```
1. User → POST /auth/login (email + password)
2. API → Kratos (validate credentials)
3. Kratos → Return session token
4. API → Set HTTP-only session cookie
5. Subsequent requests → Cookie-based auth

# Service Account Flow
1. Service → POST /auth/service-token (client_id + client_secret)
2. API → Validate, check rate limits
3. API → Return access token (JWT)
4. Subsequent requests → Bearer token
```

### 6.2 Authorization (ReBAC)

```
# Check permission before each action
1. Extract user/group from session
2. Extract resource ID from request
3. NATS request to Keto: check_relation
4. Keto → Return allowed/denied
5. Continue or 403
```

### 6.3 Guardrails (Future)

```
# Input validation
- Content filter
- PII detection
- Rate limiting per user

# Output validation
- Toxicity detection
- PII filtering
- Format validation
```

---

## 7. Deployment

### 7.1 Docker Compose (Development)

```yaml
services:
  api:
    build: ./apps/api
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=postgresql://postgres:5432/llmplatform
      - NATS_URL=nats://nats:4222
  
  nats:
    image: nats:2.10
    ports:
      - "4222:4222"
  
  postgres:
    image: postgres:16
    ports:
      - "5432:5432"
  
  redis:
    image: redis:7
    ports:
      - "6379:6379"
  
  temporal:
    image: temporalio/auto-setup
    ports:
      - "7233:7233"
```

### 7.2 Kubernetes (Production)

```
# Planned for K8s deployment
# - HorizontalPodAutoscaler for API
# - GPU nodes for vLLM/SGLang
# - Persistent volumes for PostgreSQL
# - Services mesh for NATS
```

---

## 8. Testing Strategy

### 8.1 Test Types

```
- Unit Tests (Jest/Vitest)
  - Domain logic
  - Utility functions
  - DTO validation

- Integration Tests (Supertest)
  - API endpoints
  - NATS handlers
  - Database operations

- E2E Tests (Playwright)
  - Critical user flows
  - Admin workflows

- Contract Tests
  - NATS message contracts
  - API contracts

- Load Tests
  - k6 or autocannon
  - Realistic load scenarios
```

### 8.2 Coverage Targets

```
- Unit: 80%+
- Integration: 70%+
- Critical E2E: 100%
```

---

## 9. Admin Panel Pages

### 9.1 Dashboard (`/admin`)

- System overview cards
- Quick stats (users, chats, models)
- Recent activity
- Health status

### 9.2 Users (`/admin/users`)

- User list with filters
- User details view
- Role assignment
- Group membership
- Audit logs

### 9.3 Groups (`/admin/groups`)

- Hierarchical tree view
- Create/edit/delete
- Member management

### 9.4 Chats (`/admin/chats`)

- Chat list
- Chat preview
- Message history
- Export functionality

### 9.5 Agents (`/admin/agents`)

- Agent list
- Create/edit wizard
- Tool configuration
- Execution history
- Performance metrics

### 9.6 Knowledge Bases (`/admin/knowledge-bases`)

- KB list
- Create/edit configuration
- Document management
- Search testing

### 9.7 MCP Servers (`/admin/mcp-servers`)

- Server list
- Add/edit server
- Tool testing
- Usage logs

### 9.8 Models (`/admin/models`)

- Model list
- Add/edit model
- Performance metrics
- Health status

### 9.9 Workflows (`/admin/workflows`)

- Workflow list
- Create/edit workflow
- Execution history
- Visualization

### 9.10 Service Accounts (`/admin/service-accounts`)

- Account list
- Create/edit account
- Usage statistics
- Rotate/revoke

### 9.11 System (`/admin/system`)

- Configuration editor
- Feature flags
- Maintenance mode

### 9.12 Observability (`/admin/observability`)

- Metrics dashboard
- LLM metrics dashboard
- Trace explorer
- Log viewer
- Alert configuration