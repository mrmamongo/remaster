import { z } from 'zod';

// ============================================================================
// NATS Event Schemas
// ============================================================================

// Base event
export const BaseEventSchema = z.object({
  type: z.string(),
  timestamp: z.string().datetime(),
  traceId: z.string().optional(),
});
export type BaseEvent = z.infer<typeof BaseEventSchema>;

// User events
export const UserCreatedEventSchema = BaseEventSchema.extend({
  type: z.literal('user.created'),
  payload: z.object({
    userId: z.string().uuid(),
    email: z.string().email(),
  }),
});
export type UserCreatedEvent = z.infer<typeof UserCreatedEventSchema>;

export const UserUpdatedEventSchema = BaseEventSchema.extend({
  type: z.literal('user.updated'),
  payload: z.object({
    userId: z.string().uuid(),
    changes: z.record(z.string(), z.any()),
  }),
});
export type UserUpdatedEvent = z.infer<typeof UserUpdatedEventSchema>;

// Chat events
export const ChatCreatedEventSchema = BaseEventSchema.extend({
  type: z.literal('chat.created'),
  payload: z.object({
    chatId: z.string().uuid(),
    userId: z.string().uuid(),
    name: z.string(),
  }),
});
export type ChatCreatedEvent = z.infer<typeof ChatCreatedEventSchema>;

export const MessageSentEventSchema = BaseEventSchema.extend({
  type: z.literal('message.sent'),
  payload: z.object({
    messageId: z.string().uuid(),
    chatId: z.string().uuid(),
    role: z.enum(['user', 'assistant']),
    content: z.union([z.string(), z.record(z.string(), z.any())]),
    tokensUsed: z.number().default(0),
  }),
});
export type MessageSentEvent = z.infer<typeof MessageSentEventSchema>;

// Agent events
export const AgentCreatedEventSchema = BaseEventSchema.extend({
  type: z.literal('agent.created'),
  payload: z.object({
    agentId: z.string().uuid(),
    userId: z.string().uuid(),
    name: z.string(),
  }),
});
export type AgentCreatedEvent = z.infer<typeof AgentCreatedEventSchema>;

export const AgentExecutedEventSchema = BaseEventSchema.extend({
  type: z.literal('agent.executed'),
  payload: z.object({
    executionId: z.string().uuid(),
    agentId: z.string().uuid(),
    userId: z.string().uuid(),
    status: z.enum(['pending', 'running', 'completed', 'failed']),
    iterations: z.number(),
    tokensUsed: z.number(),
  }),
});
export type AgentExecutedEvent = z.infer<typeof AgentExecutedEventSchema>;

// Knowledge Base events
export const KnowledgeBaseCreatedEventSchema = BaseEventSchema.extend({
  type: z.literal('knowledge-base.created'),
  payload: z.object({
    knowledgeBaseId: z.string().uuid(),
    ownerId: z.string().uuid(),
    name: z.string(),
  }),
});
export type KnowledgeBaseCreatedEvent = z.infer<typeof KnowledgeBaseCreatedEventSchema>;

export const DocumentEmbeddedEventSchema = BaseEventSchema.extend({
  type: z.literal('document.embedded'),
  payload: z.object({
    documentId: z.string().uuid(),
    knowledgeBaseId: z.string().uuid(),
    chunksCount: z.number(),
  }),
});
export type DocumentEmbeddedEvent = z.infer<typeof DocumentEmbeddedEventSchema>;

// MCP events
export const MCPServerConnectedEventSchema = BaseEventSchema.extend({
  type: z.literal('mcp.server.connected'),
  payload: z.object({
    serverId: z.string().uuid(),
    name: z.string(),
  }),
});
export type MCPServerConnectedEvent = z.infer<typeof MCPServerConnectedEventSchema>;

export const MCPToolExecutedEventSchema = BaseEventSchema.extend({
  type: z.literal('mcp.tool.executed'),
  payload: z.object({
    toolId: z.string().uuid(),
    serverId: z.string().uuid(),
    userId: z.string().uuid(),
    status: z.enum(['success', 'error']),
    latencyMs: z.number(),
  }),
});
export type MCPToolExecutedEvent = z.infer<typeof MCPToolExecutedEventSchema>;

// Workflow events
export const WorkflowStartedEventSchema = BaseEventSchema.extend({
  type: z.literal('workflow.started'),
  payload: z.object({
    executionId: z.string().uuid(),
    workflowId: z.string().uuid(),
    userId: z.string().uuid(),
  }),
});
export type WorkflowStartedEvent = z.infer<typeof WorkflowStartedEventSchema>;

export const WorkflowCompletedEventSchema = BaseEventSchema.extend({
  type: z.literal('workflow.completed'),
  payload: z.object({
    executionId: z.string().uuid(),
    status: z.enum(['completed', 'failed', 'cancelled']),
    durationMs: z.number(),
    output: z.record(z.string(), z.any()).nullable(),
  }),
});
export type WorkflowCompletedEvent = z.infer<typeof WorkflowCompletedEventSchema>;

// LLM Metrics events
export const LLMRequestEventSchema = BaseEventSchema.extend({
  type: z.literal('llm.request'),
  payload: z.object({
    requestId: z.string().uuid(),
    model: z.string(),
    provider: z.enum(['openai', 'anthropic', 'groq', 'local']),
    inputTokens: z.number(),
    outputTokens: z.number(),
    latencyMs: z.number(),
    status: z.enum(['success', 'error']),
    error: z.string().optional(),
  }),
});
export type LLMRequestEvent = z.infer<typeof LLMRequestEventSchema>;

// Union of all events
export const EventSchema = z.union([
  UserCreatedEventSchema,
  UserUpdatedEventSchema,
  ChatCreatedEventSchema,
  MessageSentEventSchema,
  AgentCreatedEventSchema,
  AgentExecutedEventSchema,
  KnowledgeBaseCreatedEventSchema,
  DocumentEmbeddedEventSchema,
  MCPServerConnectedEventSchema,
  MCPToolExecutedEventSchema,
  WorkflowStartedEventSchema,
  WorkflowCompletedEventSchema,
  LLMRequestEventSchema,
]);
export type Event = z.infer<typeof EventSchema>;

// ============================================================================
// NATS Reply Schemas
// ============================================================================

export const ChatListReplySchema = z.object({
  chats: z.array(z.object({
    id: z.string().uuid(),
    name: z.string(),
    agentId: z.string().uuid().nullable(),
    createdAt: z.date(),
    updatedAt: z.date(),
  })),
  total: z.number(),
});
export type ChatListReply = z.infer<typeof ChatListReplySchema>;

export const MessageListReplySchema = z.object({
  messages: z.array(z.object({
    id: z.string().uuid(),
    role: z.enum(['user', 'assistant', 'system', 'tool', 'reasoning', 'activity']),
    content: z.union([z.string(), z.record(z.string(), z.any())]),
    createdAt: z.date(),
  })),
  total: z.number(),
});
export type MessageListReply = z.infer<typeof MessageListReplySchema>;

export const KnowledgeSearchReplySchema = z.object({
  results: z.array(z.object({
    documentId: z.string().uuid(),
    chunk: z.string(),
    score: z.number(),
    metadata: z.record(z.string(), z.any()).optional(),
  })),
  query: z.string(),
});
export type KnowledgeSearchReply = z.infer<typeof KnowledgeSearchReplySchema>;

export const MCPToolsReplySchema = z.object({
  serverId: z.string().uuid(),
  tools: z.array(z.object({
    name: z.string(),
    description: z.string(),
    inputSchema: z.record(z.string(), z.any()),
  })),
});
export type MCPToolsReply = z.infer<typeof MCPToolsReplySchema>;

export const ModelsReplySchema = z.object({
  models: z.array(z.object({
    id: z.string().uuid(),
    name: z.string(),
    provider: z.enum(['openai', 'anthropic', 'groq', 'local']),
    modelType: z.enum(['chat', 'embedding', 'rerank', 'vision']),
    isEnabled: z.boolean(),
    supportsStreaming: z.boolean(),
    supportsFunctionCalling: z.boolean(),
  })),
});
export type ModelsReply = z.infer<typeof ModelsReplySchema>;

// Error reply
export const ErrorReplySchema = z.object({
  error: z.string(),
  code: z.string().optional(),
  details: z.record(z.string(), z.any()).optional(),
});
export type ErrorReply = z.infer<typeof ErrorReplySchema>;