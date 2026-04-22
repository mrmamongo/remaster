// ============================================================================
// Admin Stores
// ============================================================================

import { writable, derived } from 'svelte/store';
import { 
  mockUsers, mockUserGroups, mockChats, mockAgents, mockModels, 
  mockKnowledgeBases, mockMCPServers, mockSystemConfig 
} from '$lib/mocks';
import type { 
  User, UserGroup, Chat, Agent, Model, KnowledgeBase, MCPServer, SystemConfig 
} from '$lib/types';

// ========================================================================
// Auth Store
// ========================================================================

interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
}

export const authStore = writable<AuthState>({
  isAuthenticated: true, // Mock: auto-login as admin
  user: mockUsers[0]
});

// ========================================================================
// Users Store
// ========================================================================

export const usersStore = writable<User[]>(mockUsers);
export const selectedUserStore = writable<User | null>(null);

// ========================================================================
// User Groups Store (hierarchical)
// ========================================================================

export const userGroupsStore = writable<UserGroup[]>(mockUserGroups);

// ========================================================================
// Chats Store
// ========================================================================

export const chatsStore = writable<Chat[]>(mockChats);
export const selectedChatStore = writable<Chat | null>(null);

// ========================================================================
// Agents Store
// ========================================================================

export const agentsStore = writable<Agent[]>(mockAgents);
export const selectedAgentStore = writable<Agent | null>(null);

// ========================================================================
// Models Store
// ========================================================================

export const modelsStore = writable<Model[]>(mockModels);
export const selectedModelStore = writable<Model | null>(null);

// ========================================================================
// Knowledge Bases Store
// ========================================================================

export const knowledgeBasesStore = writable<KnowledgeBase[]>(mockKnowledgeBases);
export const selectedKnowledgeBaseStore = writable<KnowledgeBase | null>(null);

// ========================================================================
// MCP Servers Store
// ========================================================================

export const mcpServersStore = writable<MCPServer[]>(mockMCPServers);
export const selectedMCPServerStore = writable<MCPServer | null>(null);

// ========================================================================
// System Config Store
// ========================================================================

export const systemConfigStore = writable<SystemConfig[]>(mockSystemConfig);

// ========================================================================
// UI State
// ========================================================================

interface UIState {
  sidebarOpen: boolean;
  activeSection: string;
  loading: boolean;
}

export const uiStore = writable<UIState>({
  sidebarOpen: true,
  activeSection: 'dashboard',
  loading: false
});

// Derived stores
export const chatModelsStore = derived(modelsStore, ($models) => 
  $models.filter(m => m.modality === 'CHAT' && m.isActive)
);

export const embeddingModelsStore = derived(modelsStore, ($models) => 
  $models.filter(m => m.modality === 'EMBEDDINGS' && m.isActive)
);

export const activeAgentsStore = derived(agentsStore, ($agents) => 
  $agents.filter(a => a.isActive)
);

// ========================================================================
// Metrics Store (mock data)
// ========================================================================

export const metricsStore = writable({
  activeUsers: 42,
  activeChats: 156,
  totalRequests: 12500,
  avgLatency: 1.2,
  errorRate: 0.5,
  tokensUsed: 2500000
});