import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';

// ============================================================================
// ENUMS
// ============================================================================

export const MessageRoleSchema = z.enum(['user', 'assistant', 'system', 'tool', 'reasoning', 'activity']);
export type MessageRole = z.infer<typeof MessageRoleSchema>;

export const ToolTypeSchema = z.enum(['function', 'mcp', 'http']);
export type ToolType = z.infer<typeof ToolTypeSchema>;

export const SearchTypeSchema = z.enum(['semantic', 'hybrid', 'bm25']);
export type SearchType = z.infer<typeof SearchTypeSchema>;

export const DocumentStatusSchema = z.enum(['pending', 'processing', 'ready', 'error']);
export type DocumentStatus = z.infer<typeof DocumentStatusSchema>;

export const AuthTypeSchema = z.enum(['none', 'api_key', 'oauth']);
export type AuthType = z.infer<typeof AuthTypeSchema>;

export const ModelProviderSchema = z.enum(['openai', 'anthropic', 'groq', 'local']);
export type ModelProvider = z.infer<typeof ModelProviderSchema>;

export const ModelTypeSchema = z.enum(['chat', 'embedding', 'rerank', 'vision']);
export type ModelType = z.infer<typeof ModelTypeSchema>;

export const ScopeSchema = z.enum(['global', 'group', 'resource']);
export type Scope = z.infer<typeof ScopeSchema>;

export const WorkflowTypeSchema = z.enum(['simple', 'chain', 'parallel', 'conditional']);
export type WorkflowType = z.infer<typeof WorkflowTypeSchema>;

export const ExecutionStatusSchema = z.enum(['pending', 'running', 'completed', 'failed', 'cancelled']);
export type ExecutionStatus = z.infer<typeof ExecutionStatusSchema>;

export const UsageStatusSchema = z.enum(['success', 'error']);
export type UsageStatus = z.infer<typeof UsageStatusSchema>;

// ============================================================================
// BASE ENTITIES
// ============================================================================

export const BaseEntitySchema = z.object({
  id: z.string().uuid(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const MetadataSchema = z.record(z.string(), z.any()).optional();

export type BaseEntity = z.infer<typeof BaseEntitySchema>;

// ============================================================================
// USER & GROUPS
// ============================================================================

export const UserSchema = BaseEntitySchema.extend({
  email: z.string().email(),
  oryKratosId: z.string().optional(),
  metadata: MetadataSchema,
});
export type User = z.infer<typeof UserSchema>;

export const GroupSchema = BaseEntitySchema.extend({
  name: z.string().min(1).max(100),
  parentId: z.string().uuid().nullable(),
  path: z.string(),
  depth: z.number().min(1).max(5),
  metadata: MetadataSchema,
});
export type Group = z.infer<typeof GroupSchema>;

// ============================================================================
// CHAT & MESSAGES
// ============================================================================

export const ChatSchema = BaseEntitySchema.extend({
  userId: z.string().uuid(),
  name: z.string().min(1).max(200),
  agentId: z.string().uuid().nullable(),
  metadata: MetadataSchema,
});
export type Chat = z.infer<typeof ChatSchema>;

// Message content types (multimodal)
export const TextContentSchema = z.object({
  type: z.literal('text'),
  text: z.string(),
});

export const ImageContentSchema = z.object({
  type: z.literal('image'),
  source: z.object({
    type: z.enum(['url', 'data']),
    value: z.string(),
    mimeType: z.string(),
  }),
});

export const InputContentSchema = z.union([TextContentSchema, ImageContentSchema]);
export type InputContent = z.infer<typeof InputContentSchema>;

// Tool call
export const ToolCallSchema = z.object({
  id: z.string(),
  name: z.string(),
  arguments: z.union([z.string(), z.record(z.string(), z.any())]),
});
export type ToolCall = z.infer<typeof ToolCallSchema>;

// Message
export const MessageSchema = BaseEntitySchema.extend({
  chatId: z.string().uuid(),
  role: MessageRoleSchema,
  content: z.union([z.string(), z.record(z.string(), z.any())]),
  model: z.string().optional(),
  toolCalls: z.array(ToolCallSchema).optional(),
  toolCallId: z.string().uuid().nullable(),
  reasoning: z.string().optional(),
  activityType: z.string().optional(),
  tokensUsed: z.number().default(0),
  latencyMs: z.number().default(0),
  metadata: MetadataSchema,
});
export type Message = z.infer<typeof MessageSchema>;

// ============================================================================
// TOOLS & AGENTS
// ============================================================================

export const ToolSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(100),
  description: z.string(),
  type: ToolTypeSchema,
  definition: z.record(z.string(), z.any()),
  isEnabled: z.boolean().default(true),
});
export type Tool = z.infer<typeof ToolSchema>;

export const AgentSchema = BaseEntitySchema.extend({
  name: z.string().min(1).max(100),
  description: z.string(),
  systemPrompt: z.string(),
  modelId: z.string().uuid(),
  tools: z.array(z.string().uuid()),
  maxIterations: z.number().default(10),
  temperature: z.number().min(0).max(2).default(0.7),
  metadata: MetadataSchema,
});
export type Agent = z.infer<typeof AgentSchema>;

// ============================================================================
// KNOWLEDGE BASE
// ============================================================================

export const KnowledgeBaseSchema = BaseEntitySchema.extend({
  name: z.string().min(1).max(200),
  description: z.string().optional(),
  ownerId: z.string().uuid(),
  embeddingModelId: z.string().uuid(),
  searchType: SearchTypeSchema.default('semantic'),
  chunkSize: z.number().default(1000),
  chunkOverlap: z.number().default(200),
  metadata: MetadataSchema,
});
export type KnowledgeBase = z.infer<typeof KnowledgeBaseSchema>;

export const KnowledgeBaseDocumentSchema = BaseEntitySchema.extend({
  knowledgeBaseId: z.string().uuid(),
  filename: z.string(),
  filePath: z.string(),
  fileSize: z.number(),
  mimeType: z.string(),
  status: DocumentStatusSchema.default('pending'),
  chunksCount: z.number().default(0),
  embeddedAt: z.date().nullable(),
  metadata: MetadataSchema,
});
export type KnowledgeBaseDocument = z.infer<typeof KnowledgeBaseDocumentSchema>;

// ============================================================================
// MCP
// ============================================================================

export const MCPServerSchema = BaseEntitySchema.extend({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  endpoint: z.string().url(),
  authType: AuthTypeSchema.default('none'),
  authConfig: z.record(z.string(), z.any()).optional(),
  isEnabled: z.boolean().default(true),
  createdBy: z.string().uuid(),
  metadata: MetadataSchema,
});
export type MCPServer = z.infer<typeof MCPServerSchema>;

export const MCPToolSchema = z.object({
  id: z.string().uuid(),
  mcpServerId: z.string().uuid(),
  name: z.string(),
  description: z.string(),
  inputSchema: z.record(z.string(), z.any()),
  metadata: MetadataSchema,
});
export type MCPTool = z.infer<typeof MCPToolSchema>;

// ============================================================================
// MODELS
// ============================================================================

export const ModelSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  provider: ModelProviderSchema,
  modelType: ModelTypeSchema,
  endpointUrl: z.string().url().nullable(),
  apiKeyRef: z.string(),
  isEnabled: z.boolean().default(true),
  maxTokens: z.number().default(4096),
  supportsStreaming: z.boolean().default(false),
  supportsFunctionCalling: z.boolean().default(false),
  pricing: z.record(z.string(), z.number()).optional(),
  metadata: MetadataSchema,
  createdAt: z.date(),
  updatedAt: z.date(),
});
export type Model = z.infer<typeof ModelSchema>;

// ============================================================================
// ROLES & PERMISSIONS
// ============================================================================

export const RoleSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  permissions: z.array(z.string()),
});
export type Role = z.infer<typeof RoleSchema>;

export const UserRoleSchema = z.object({
  userId: z.string().uuid(),
  roleId: z.string().uuid(),
  scope: ScopeSchema.default('global'),
});
export type UserRole = z.infer<typeof UserRoleSchema>;

// ============================================================================
// SERVICE ACCOUNTS
// ============================================================================

export const ServiceAccountSchema = BaseEntitySchema.extend({
  name: z.string().min(1).max(100),
  userId: z.string().uuid(),
  groupId: z.string().uuid().nullable(),
  secretHash: z.string(),
  scopes: z.array(z.string()),
  rateLimitRpm: z.number().default(60),
  rateLimitTpmDaily: z.number().default(1000000),
  isActive: z.boolean().default(true),
  lastUsedAt: z.date().nullable(),
  expiresAt: z.date().nullable(),
  metadata: MetadataSchema,
});
export type ServiceAccount = z.infer<typeof ServiceAccountSchema>;

// ============================================================================
// AUDIT LOGS
// ============================================================================

export const AuditLogSchema = BaseEntitySchema.extend({
  userId: z.string().uuid(),
  action: z.string(),
  resourceType: z.string(),
  resourceId: z.string().uuid(),
  oldValue: z.record(z.string(), z.any()).nullable(),
  newValue: z.record(z.string(), z.any()).nullable(),
  ipAddress: z.string().optional(),
  userAgent: z.string().optional(),
});
export type AuditLog = z.infer<typeof AuditLogSchema>;

export const ServiceAccountAuditLogSchema = z.object({
  id: z.string().uuid(),
  serviceAccountId: z.string().uuid(),
  action: z.string(),
  resourceType: z.string(),
  resourceId: z.string().uuid().nullable(),
  ipAddress: z.string().optional(),
  userAgent: z.string().optional(),
  createdAt: z.date(),
});
export type ServiceAccountAuditLog = z.infer<typeof ServiceAccountAuditLogSchema>;

export const MCPToolUsageLogSchema = z.object({
  id: z.string().uuid(),
  mcpToolId: z.string().uuid(),
  userId: z.string().uuid(),
  serviceAccountId: z.string().uuid().nullable(),
  status: UsageStatusSchema,
  latencyMs: z.number(),
  errorMessage: z.string().nullable(),
  createdAt: z.date(),
});
export type MCPToolUsageLog = z.infer<typeof MCPToolUsageLogSchema>;

// ============================================================================
// WORKFLOWS
// ============================================================================

export const AgentWorkflowSchema = BaseEntitySchema.extend({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  workflowType: WorkflowTypeSchema,
  definition: z.record(z.string(), z.any()),
  inputSchema: z.record(z.string(), z.any()),
  outputSchema: z.record(z.string(), z.any()),
  isActive: z.boolean().default(true),
  metadata: MetadataSchema,
});
export type AgentWorkflow = z.infer<typeof AgentWorkflowSchema>;

export const AgentWorkflowExecutionSchema = BaseEntitySchema.extend({
  workflowId: z.string().uuid(),
  userId: z.string().uuid(),
  status: ExecutionStatusSchema,
  input: z.record(z.string(), z.any()),
  output: z.record(z.string(), z.any()).nullable(),
  error: z.string().nullable(),
  startedAt: z.date(),
  completedAt: z.date().nullable(),
  metadata: MetadataSchema,
});
export type AgentWorkflowExecution = z.infer<typeof AgentWorkflowExecutionSchema>;

export const AgentWorkflowMetricsSchema = z.object({
  id: z.string().uuid(),
  workflowId: z.string().uuid(),
  date: z.date(),
  totalExecutions: z.number(),
  successfulExecutions: z.number(),
  failedExecutions: z.number(),
  avgDurationMs: z.number(),
  p95DurationMs: z.number(),
});
export type AgentWorkflowMetrics = z.infer<typeof AgentWorkflowMetricsSchema>;

// ============================================================================
// HELPERS
// ============================================================================

export function createId(): string {
  return uuidv4();
}

export function now(): Date {
  return new Date();
}