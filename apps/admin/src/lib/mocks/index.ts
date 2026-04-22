// ============================================================================
// Admin Mocks
// ============================================================================

import type { 
  User, Chat, Agent, Model, KnowledgeBase, MCPServer, SystemConfig 
} from '$lib/types';

// ============================================================================
// Users
// ============================================================================

export const mockUsers: User[] = [
  {
    id: '1',
    email: 'admin@llm.local',
    displayName: 'Admin User',
    status: 'ACTIVE',
    oryIdentityId: 'ory_admin_1',
    preferences: {},
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-15T00:00:00Z'
  },
  {
    id: '2',
    email: 'user@llm.local',
    displayName: 'Test User',
    status: 'ACTIVE',
    oryIdentityId: 'ory_user_2',
    preferences: {},
    createdAt: '2024-01-10T00:00:00Z',
    updatedAt: '2024-01-10T00:00:00Z'
  }
];

// ============================================================================
// User Groups
// ============================================================================

export const mockUserGroups = [
  {
    id: 'g1',
    name: 'Engineering',
    parentId: null,
    members: [
      { userId: '1', groupId: 'g1', role: 'admin' }
    ]
  },
  {
    id: 'g2',
    name: 'Data Science',
    parentId: null,
    members: [
      { userId: '2', groupId: 'g2', role: 'member' }
    ]
  },
  {
    id: 'g3',
    name: 'Sub Team',
    parentId: 'g2',
    members: []
  }
];

// ============================================================================
// Chats
// ============================================================================

export const mockChats = [
  {
    id: 'chat_1',
    userId: '1',
    name: 'General Chat',
    metadata: {},
    createdAt: '2024-01-15T10:00:00Z',
    updatedAt: '2024-01-15T12:00:00Z'
  },
  {
    id: 'chat_2',
    userId: '2',
    name: 'ML Discussion',
    metadata: {},
    createdAt: '2024-01-14T08:00:00Z',
    updatedAt: '2024-01-14T09:00:00Z'
  }
];

// ============================================================================
// Agents
// ============================================================================

export const mockAgents = [
  {
    id: 'agent_1',
    name: 'Code Assistant',
    description: 'Helps with coding tasks',
    ownerType: 'PLATFORM',
    ownerId: 'platform',
    systemPrompt: 'You are a helpful coding assistant.',
    modelId: 'model_1',
    tools: ['web_search', 'file_read', 'bash'],
    maxTurns: 10,
    timeoutSeconds: 300,
    isActive: true,
    metadata: {},
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  },
  {
    id: 'agent_2',
    name: 'Research Agent',
    description: 'Research agent for knowledge base queries',
    ownerType: 'USER',
    ownerId: '1',
    systemPrompt: 'Search and analyze information.',
    modelId: 'model_2',
    tools: ['web_search', 'knowledge_search'],
    maxTurns: 15,
    timeoutSeconds: 600,
    isActive: true,
    metadata: {},
    createdAt: '2024-01-05T00:00:00Z',
    updatedAt: '2024-01-05T00:00:00Z'
  }
];

// ============================================================================
// Models
// ============================================================================

export const mockModels = [
  {
    id: 'model_1',
    name: 'gpt-4',
    provider: 'OPENAI',
    modality: 'CHAT',
    endpoint: 'https://api.openai.com/v1',
    apiKeyRef: 'openai_key',
    config: { temperature: 0.7 },
    pricing: { input: 0.03, output: 0.06 },
    isActive: true,
    isDefault: true,
    capabilities: ['chat', 'functions'],
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  },
  {
    id: 'model_2',
    name: 'claude-3-opus',
    provider: 'ANTHROPIC',
    modality: 'CHAT',
    endpoint: 'https://api.anthropic.com',
    apiKeyRef: 'anthropic_key',
    config: { temperature: 0.7 },
    pricing: { input: 0.015, output: 0.075 },
    isActive: true,
    isDefault: false,
    capabilities: ['chat', 'vision'],
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  },
  {
    id: 'model_3',
    name: 'llama-3-70b',
    provider: 'LOCAL',
    modality: 'CHAT',
    endpoint: 'http://llama-server:8080/v1',
    apiKeyRef: 'local_key',
    config: {},
    pricing: { input: 0, output: 0 },
    isActive: true,
    isDefault: false,
    capabilities: ['chat'],
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  },
  {
    id: 'model_emb_1',
    name: 'text-embedding-3-small',
    provider: 'OPENAI',
    modality: 'EMBEDDINGS',
    endpoint: 'https://api.openai.com/v1',
    apiKeyRef: 'openai_key',
    config: { dimensions: 1536 },
    pricing: { input: 0.0001, output: 0 },
    isActive: true,
    isDefault: true,
    capabilities: ['embeddings'],
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  }
];

// ============================================================================
// Knowledge Bases
// ============================================================================

export const mockKnowledgeBases = [
  {
    id: 'kb_1',
    name: 'Internal Docs',
    ownerId: '1',
    searchMethods: ['VECTOR', 'HYBRID'],
    embeddingModelId: 'model_emb_1',
    rerankerModelId: null,
    topK: 5,
    chunkSize: 1000,
    chunkOverlap: 200,
    isActive: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  },
  {
    id: 'kb_2',
    name: 'Product Wiki',
    ownerId: '1',
    searchMethods: ['VECTOR'],
    embeddingModelId: 'model_emb_1',
    rerankerModelId: null,
    topK: 3,
    chunkSize: 500,
    chunkOverlap: 100,
    isActive: true,
    createdAt: '2024-01-10T00:00:00Z',
    updatedAt: '2024-01-10T00:00:00Z'
  }
];

// ============================================================================
// MCP Servers
// ============================================================================

export const mockMCPServers = [
  {
    id: 'mcp_1',
    name: 'Filesystem MCP',
    ownerId: '1',
    url: 'http://localhost:3001',
    authType: 'NONE',
    status: 'ACTIVE',
    metadata: {},
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  },
  {
    id: 'mcp_2',
    name: 'GitHub MCP',
    ownerId: '1',
    url: 'http://localhost:3002',
    authType: 'API_KEY',
    authConfig: { header: 'X-API-Key' },
    status: 'ACTIVE',
    metadata: {},
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  }
];

// ============================================================================
// System Config
// ============================================================================

export const mockSystemConfig: SystemConfig[] = [
  {
    id: 'cfg_1',
    key: 'default_model',
    value: 'gpt-4',
    category: 'models',
    isEditable: true,
    description: 'Default model for chat',
    updatedAt: '2024-01-01T00:00:00Z'
  },
  {
    id: 'cfg_2',
    key: 'max_tokens',
    value: 4096,
    category: 'models',
    isEditable: true,
    description: 'Max tokens per request',
    updatedAt: '2024-01-01T00:00:00Z'
  },
  {
    id: 'cfg_3',
    key: 'rate_limit',
    value: 100,
    category: 'limits',
    isEditable: true,
    description: 'Requests per minute',
    updatedAt: '2024-01-01T00:00:00Z'
  }
];

// ============================================================================
// Metrics (Mock - VictoriaMetrics format)
// ============================================================================

export const mockMetrics = {
  // System metrics
  cpu_usage: 'histogram_bucket{method="GET",status="200"}',
  memory_usage: 'process_resident_memory_bytes',
  request_count: 'http_requests_total',
  
  // LLM metrics
  llm_requests_total: 'llm_requests_total',
  llm_tokens_total: 'llm_tokens_total',
  llm_latency_seconds: 'llm_latency_seconds',
  llm_errors_total: 'llm_errors_total',
  
  // Business metrics
  active_users: 'active_users',
  active_chats: 'active_chats',
  agent_executions: 'agent_executions_total'
};

// ============================================================================
// Logs (Mock - VictoriaLogs format)
// ============================================================================

export const mockLogs = [
  {
    _time: '2024-01-15T10:00:00.000Z',
    level: 'info',
    service: 'api',
    message: 'Request started',
    trace_id: 'trace_1'
  },
  {
    _time: '2024-01-15T10:00:01.000Z',
    level: 'info',
    service: 'api',
    message: 'Request completed',
    trace_id: 'trace_1'
  },
  {
    _time: '2024-01-15T10:00:02.000Z',
    level: 'error',
    service: 'llm',
    message: 'LLM request failed',
    error: 'rate_limit_exceeded',
    trace_id: 'trace_2'
  }
];

// ============================================================================
// Traces (Mock - Jaeger format)
// ============================================================================

export const mockTraces = [
  {
    traceID: 'trace_1',
    spans: [
      {
        traceID: 'trace_1',
        spanID: 'span_1',
        operationName: 'chat.sendMessage',
        startTime: 1705312800000,
        duration: 1500,
        status: { code: 0 }
      },
      {
        traceID: 'trace_1',
        spanID: 'span_2',
        operationName: 'llm.invoke',
        startTime: 1705312800500,
        duration: 1000,
        status: { code: 0 }
      }
    ]
  },
  {
    traceID: 'trace_2',
    spans: [
      {
        traceID: 'trace_2',
        spanID: 'span_3',
        operationName: 'agent.execute',
        startTime: 1705312900000,
        duration: 5000,
        status: { code: 0 }
      }
    ]
  }
];