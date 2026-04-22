// ============================================================================
// Admin Types
// ============================================================================

// ============================================================================
// User Types
// ============================================================================

export type UserStatus = 'ACTIVE' | 'SUSPENDED' | 'DELETED';

export interface User {
  id: string;
  email: string;
  displayName?: string;
  status: UserStatus;
  oryIdentityId?: string;
  preferences?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface UserGroup {
  id: string;
  name: string;
  parentId?: string;
  metadata?: Record<string, any>;
  members: UserGroupMember[];
  createdAt: string;
  updatedAt: string;
}

export interface UserGroupMember {
  userId: string;
  groupId: string;
  role: string;
}

// ============================================================================
// Chat Types
// ============================================================================

export interface Chat {
  id: string;
  userId: string;
  name: string;
  agentId?: string;
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface Message {
  id: string;
  chatId: string;
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  toolCalls?: any[];
  model?: string;
  usage?: Record<string, number>;
  createdAt: string;
}

// ============================================================================
// Agent Types
// ============================================================================

export type OwnerType = 'USER' | 'GROUP' | 'PLATFORM';

export interface Agent {
  id: string;
  name: string;
  description?: string;
  ownerType: OwnerType;
  ownerId: string;
  systemPrompt?: string;
  modelId?: string;
  tools?: string[];
  maxTurns: number;
  timeoutSeconds: number;
  isActive: boolean;
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// Model Types
// ============================================================================

export type ModelProvider = 'OPENAI' | 'ANTHROPIC' | 'GROQ' | 'LOCAL';
export type ModelModality = 'CHAT' | 'EMBEDDINGS' | 'RERANK' | 'VISION';

export interface Model {
  id: string;
  name: string;
  provider: ModelProvider;
  modality: ModelModality;
  endpoint?: string;
  apiKeyRef: string;
  config?: Record<string, any>;
  pricing?: { input: number; output: number };
  isActive: boolean;
  isDefault: boolean;
  capabilities?: string[];
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// Knowledge Base Types
// ============================================================================

export type SearchMethod = 'VECTOR' | 'BM25' | 'HYBRID';

export interface KnowledgeBase {
  id: string;
  name: string;
  ownerId: string;
  searchMethods: SearchMethod[];
  embeddingModelId?: string;
  rerankerModelId?: string;
  topK: number;
  chunkSize: number;
  chunkOverlap: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// MCP Types
// ============================================================================

export type MCAuthType = 'NONE' | 'OAUTH2' | 'API_KEY';
export type ServerStatus = 'ACTIVE' | 'INACTIVE' | 'ERROR';

export interface MCPServer {
  id: string;
  name: string;
  ownerId: string;
  url: string;
  authType: MCAuthType;
  authConfig?: Record<string, any>;
  status: ServerStatus;
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// System Config
// ============================================================================

export interface SystemConfig {
  id: string;
  key: string;
  value: any;
  category: string;
  isEditable: boolean;
  description?: string;
  updatedAt: string;
}

// ============================================================================
// Audit
// ============================================================================

export interface AuditLog {
  id: string;
  userId: string;
  action: string;
  resource: string;
  resourceId?: string;
  details?: Record<string, any>;
  createdAt: string;
}

// ============================================================================
// API Response Types
// ============================================================================

export interface ApiResponse<T> {
  data: T;
  message?: string;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, any>;
}

export interface PaginatedResponse<T> {
  data: T[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

// ============================================================================
// Observability Types
// ============================================================================

export interface MetricPoint {
  timestamp: number;
  value: number;
}

export interface LogEntry {
  _time: string;
  level: string;
  service: string;
  message: string;
  [key: string]: any;
}

export interface TraceSpan {
  traceID: string;
  spanID: string;
  operationName: string;
  startTime: number;
  duration: number;
  status: { code: number };
  tags?: Record<string, string>;
}

export interface Trace {
  traceID: string;
  spans: TraceSpan[];
}