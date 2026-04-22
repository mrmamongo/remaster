// ============================================================================
// Common Types & DTOs
// ============================================================================

// User types
export type { User, UserStatus, UserGroup, UserGroupMember } from './types/user';

// Chat types
export type { Chat, Message, MessageRole } from './types/chat';

// Agent types
export type { Agent, AgentTool, AgentExecution } from './types/agent';

// Knowledge Base types
export type { KnowledgeBase, Document, Chunk, SearchMethod } from './types/knowledge';

// Model types
export type { Model, ModelProvider, ModelModality } from './types/model';

// MCP types
export type { MCPServer, MCPServerStatus, MCPAuthType } from './types/mcp';

// ============================================================================
// Common DTOs
// ============================================================================

export * from './dto/common.dto';
export * from './dto/pagination.dto';

// ============================================================================
// Common Interfaces
// ============================================================================

export interface IBaseEntity {
  id: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IOwner {
  ownerType: 'USER' | 'GROUP' | 'PLATFORM';
  ownerId: string;
}

export interface IPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface IApiResponse<T> {
  data: T;
  message?: string;
}

export interface IApiError {
  code: string;
  message: string;
  details?: Record<string, any>;
}

export interface IHealthCheck {
  status: 'ok' | 'degraded' | 'down';
  timestamp: string;
  service: string;
  checks?: Record<string, IHealthCheck>;
}

// ============================================================================
// NATS Subjects
// ============================================================================

export const NATS_SUBJECTS = {
  // LLM Inference
  LLM_INFERENCE: 'llm.inference',
  LLM_INFERENCE_RESPONSE: 'llm.inference.response',
  
  // Embeddings
  LLM_EMBEDDING: 'llm.embedding',
  LLM_EMBEDDING_RESPONSE: 'llm.embedding.response',
  
  // Reranking
  LLM_RERANK: 'llm.rerank',
  LLM_RERANK_RESPONSE: 'llm.rerank.response',
  
  // Chat
  CHAT_MESSAGE: 'chat.message',
  CHAT_STREAMING: 'chat.streaming',
  
  // Agent
  AGENT_EXECUTION_START: 'agent.execution.start',
  AGENT_EXECUTION_PROGRESS: 'agent.execution.progress',
  AGENT_EXECUTION_COMPLETE: 'agent.execution.complete',
  AGENT_EXECUTION_ERROR: 'agent.execution.error',
  
  // Knowledge Base
  KNOWLEDGE_INDEX: 'knowledge.index',
  KNOWLEDGE_SEARCH: 'knowledge.search',
  KNOWLEDGE_SEARCH_RESPONSE: 'knowledge.search.response',
  
  // MCP
  MCP_TOOL_EXECUTE: 'mcp.tool.execute',
  MCP_TOOL_RESULT: 'mcp.tool.result',
  
  // System
  SYSTEM_CONFIG_UPDATED: 'system.config.updated',
  SYSTEM_METRICS_PUSH: 'system.metrics.push'
} as const;

// ============================================================================
// Error Codes
// ============================================================================

export const ERROR_CODES = {
  // Auth
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  INVALID_TOKEN: 'INVALID_TOKEN',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  
  // Resource
  NOT_FOUND: 'NOT_FOUND',
  ALREADY_EXISTS: 'ALREADY_EXISTS',
  INVALID_INPUT: 'INVALID_INPUT',
  
  // LLM
  LLM_ERROR: 'LLM_ERROR',
  LLM_RATE_LIMIT: 'LLM_RATE_LIMIT',
  LLM_TIMEOUT: 'LLM_TIMEOUT',
  MODEL_NOT_FOUND: 'MODEL_NOT_FOUND',
  
  // Agent
  AGENT_ERROR: 'AGENT_ERROR',
  AGENT_TIMEOUT: 'AGENT_TIMEOUT',
  TOOL_ERROR: 'TOOL_ERROR',
  
  // Knowledge Base
  KNOWLEDGE_ERROR: 'KNOWLEDGE_ERROR',
  INDEX_ERROR: 'INDEX_ERROR',
  
  // MCP
  MCP_CONNECTION_ERROR: 'MCP_CONNECTION_ERROR',
  MCP_TOOL_NOT_FOUND: 'MCP_TOOL_NOT_FOUND',
  
  // System
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE'
} as const;

// ============================================================================
// Event Types
// ============================================================================

export interface INatsMessage<T = any> {
  subject: string;
  data: T;
  reply?: string;
}

export interface INatsRequest<T = any, R = any> {
  data: T;
  timeout?: number;
}

export interface INatsResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}