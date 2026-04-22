import { z } from 'zod';

// ============================================================================
// Chat DTOs
// ============================================================================

export const CreateChatDtoSchema = z.object({
  name: z.string().min(1).max(200),
  agentId: z.string().uuid().optional(),
});

export const UpdateChatDtoSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  agentId: z.string().uuid().nullable().optional(),
});

export const ChatFilterDtoSchema = z.object({
  limit: z.number().min(1).max(100).default(20),
  offset: z.number().min(0).default(0),
  search: z.string().optional(),
});

export const SendMessageDtoSchema = z.object({
  content: z.union([z.string(), z.record(z.string(), z.any())]),
  modelOverride: z.string().optional(),
  temperature: z.number().min(0).max(2).optional(),
  stream: z.boolean().default(false),
});

export type CreateChatDto = z.infer<typeof CreateChatDtoSchema>;
export type UpdateChatDto = z.infer<typeof UpdateChatDtoSchema>;
export type ChatFilterDto = z.infer<typeof ChatFilterDtoSchema>;
export type SendMessageDto = z.infer<typeof SendMessageDtoSchema>;

// ============================================================================
// Agent DTOs
// ============================================================================

export const CreateAgentDtoSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  systemPrompt: z.string(),
  modelId: z.string().uuid(),
  tools: z.array(z.string().uuid()).default([]),
  maxIterations: z.number().min(1).max(50).default(10),
  temperature: z.number().min(0).max(2).default(0.7),
});

export const UpdateAgentDtoSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().optional(),
  systemPrompt: z.string().optional(),
  modelId: z.string().uuid().optional(),
  tools: z.array(z.string().uuid()).optional(),
  maxIterations: z.number().min(1).max(50).optional(),
  temperature: z.number().min(0).max(2).optional(),
});

export const ExecuteAgentDtoSchema = z.object({
  input: z.string(),
  chatId: z.string().uuid().optional(),
  stream: z.boolean().default(false),
});

export type CreateAgentDto = z.infer<typeof CreateAgentDtoSchema>;
export type UpdateAgentDto = z.infer<typeof UpdateAgentDtoSchema>;
export type ExecuteAgentDto = z.infer<typeof ExecuteAgentDtoSchema>;

// ============================================================================
// Knowledge Base DTOs
// ============================================================================

export const CreateKnowledgeBaseDtoSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().optional(),
  embeddingModelId: z.string().uuid(),
  searchType: z.enum(['semantic', 'hybrid', 'bm25']).default('semantic'),
  chunkSize: z.number().min(100).max(10000).default(1000),
  chunkOverlap: z.number().min(0).max(1000).default(200),
});

export const UpdateKnowledgeBaseDtoSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().optional(),
  embeddingModelId: z.string().uuid().optional(),
  searchType: z.enum(['semantic', 'hybrid', 'bm25']).optional(),
  chunkSize: z.number().min(100).max(10000).optional(),
  chunkOverlap: z.number().min(0).max(1000).optional(),
});

export const SearchKnowledgeBaseDtoSchema = z.object({
  query: z.string().min(1),
  limit: z.number().min(1).max(50).default(5),
  filter: z.record(z.string(), z.any()).optional(),
});

export type CreateKnowledgeBaseDto = z.infer<typeof CreateKnowledgeBaseDtoSchema>;
export type UpdateKnowledgeBaseDto = z.infer<typeof UpdateKnowledgeBaseDtoSchema>;
export type SearchKnowledgeBaseDto = z.infer<typeof SearchKnowledgeBaseDtoSchema>;

// ============================================================================
// MCP DTOs
// ============================================================================

export const CreateMCPServerDtoSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  endpoint: z.string().url(),
  authType: z.enum(['none', 'api_key', 'oauth']).default('none'),
  authConfig: z.record(z.string(), z.any()).optional(),
});

export const UpdateMCPServerDtoSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().optional(),
  endpoint: z.string().url().optional(),
  authType: z.enum(['none', 'api_key', 'oauth']).optional(),
  authConfig: z.record(z.string(), z.any()).optional(),
  isEnabled: z.boolean().optional(),
});

export const TestMCPServerDtoSchema = z.object({
  toolName: z.string().optional(),
});

export const ExecuteMCPToolDtoSchema = z.object({
  toolName: z.string(),
  arguments: z.record(z.string(), z.any()),
});

export type CreateMCPServerDto = z.infer<typeof CreateMCPServerDtoSchema>;
export type UpdateMCPServerDto = z.infer<typeof UpdateMCPServerDtoSchema>;
export type TestMCPServerDto = z.infer<typeof TestMCPServerDtoSchema>;
export type ExecuteMCPToolDto = z.infer<typeof ExecuteMCPToolDtoSchema>;

// ============================================================================
// Model DTOs
// ============================================================================

export const CreateModelDtoSchema = z.object({
  name: z.string(),
  provider: z.enum(['openai', 'anthropic', 'groq', 'local']),
  modelType: z.enum(['chat', 'embedding', 'rerank', 'vision']),
  endpointUrl: z.string().url().nullable().optional(),
  apiKeyRef: z.string(),
  maxTokens: z.number().default(4096),
  supportsStreaming: z.boolean().default(false),
  supportsFunctionCalling: z.boolean().default(false),
  pricing: z.record(z.string(), z.number()).optional(),
});

export const UpdateModelDtoSchema = z.object({
  name: z.string().optional(),
  endpointUrl: z.string().url().nullable().optional(),
  apiKeyRef: z.string().optional(),
  isEnabled: z.boolean().optional(),
  maxTokens: z.number().optional(),
  supportsStreaming: z.boolean().optional(),
  supportsFunctionCalling: z.boolean().optional(),
  pricing: z.record(z.string(), z.number()).optional(),
});

export type CreateModelDto = z.infer<typeof CreateModelDtoSchema>;
export type UpdateModelDto = z.infer<typeof UpdateModelDtoSchema>;

// ============================================================================
// Service Account DTOs
// ============================================================================

export const CreateServiceAccountDtoSchema = z.object({
  name: z.string().min(1).max(100),
  groupId: z.string().uuid().nullable().optional(),
  scopes: z.array(z.string()).default(['chat:read', 'chat:write']),
  rateLimitRpm: z.number().default(60),
  rateLimitTpmDaily: z.number().default(1000000),
  expiresAt: z.date().nullable().optional(),
});

export const UpdateServiceAccountDtoSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  groupId: z.string().uuid().nullable().optional(),
  scopes: z.array(z.string()).optional(),
  rateLimitRpm: z.number().optional(),
  rateLimitTpmDaily: z.number().optional(),
  isActive: z.boolean().optional(),
  expiresAt: z.date().nullable().optional(),
});

export const RotateServiceAccountSecretDtoSchema = z.object({
  expiresAt: z.date().nullable().optional(),
});

export type CreateServiceAccountDto = z.infer<typeof CreateServiceAccountDtoSchema>;
export type UpdateServiceAccountDto = z.infer<typeof UpdateServiceAccountDtoSchema>;
export type RotateServiceAccountSecretDto = z.infer<typeof RotateServiceAccountSecretDtoSchema>;

// ============================================================================
// Auth DTOs
// ============================================================================

export const LoginDtoSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export const RegisterDtoSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().optional(),
});

export const RefreshTokenDtoSchema = z.object({
  refreshToken: z.string(),
});

export type LoginDto = z.infer<typeof LoginDtoSchema>;
export type RegisterDto = z.infer<typeof RegisterDtoSchema>;
export type RefreshTokenDto = z.infer<typeof RefreshTokenDtoSchema>;

// ============================================================================
// Admin DTOs
// ============================================================================

export const UpdateUserDtoSchema = z.object({
  email: z.string().email().optional(),
  metadata: z.record(z.string(), z.any()).optional(),
});

export const CreateGroupDtoSchema = z.object({
  name: z.string().min(1).max(100),
  parentId: z.string().uuid().nullable().optional(),
});

export const UpdateGroupDtoSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  parentId: z.string().uuid().nullable().optional(),
});

export const AssignRoleDtoSchema = z.object({
  userId: z.string().uuid(),
  roleId: z.string().uuid(),
  scope: z.enum(['global', 'group', 'resource']).default('global'),
  resourceId: z.string().uuid().optional(),
});

export type UpdateUserDto = z.infer<typeof UpdateUserDtoSchema>;
export type CreateGroupDto = z.infer<typeof CreateGroupDtoSchema>;
export type UpdateGroupDto = z.infer<typeof UpdateGroupDtoSchema>;
export type AssignRoleDto = z.infer<typeof AssignRoleDtoSchema>;