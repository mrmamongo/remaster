<script lang="ts">
  // ============================================================================
  // Admin Dashboard Page
  // ============================================================================
  
  import { metricsStore, agentsStore, modelsStore, knowledgeBasesStore, mcpServersStore } from '$lib/stores';
  
  const statCards = $derived([
    { label: 'Active Users', value: $metricsStore.activeUsers, icon: 'users', color: 'blue' },
    { label: 'Active Chats', value: $metricsStore.activeChats, icon: 'message', color: 'green' },
    { label: 'Total Requests', value: $metricsStore.totalRequests.toLocaleString(), icon: 'chart', color: 'purple' },
    { label: 'Avg Latency', value: $metricsStore.avgLatency + 's', icon: 'zap', color: 'orange' },
    { label: 'Error Rate', value: $metricsStore.errorRate + '%', icon: 'alert', color: 'red' },
    { label: 'Tokens Used', value: ($metricsStore.tokensUsed / 1000000).toFixed(1) + 'M', icon: 'cpu', color: 'cyan' }
  ]);
  
  const recentAgents = $derived($agentsStore.slice(0, 5));
  const activeModels = $derived($modelsStore.filter(m => m.isActive));
</script>

<svelte:head>
  <title>Dashboard | LLM Platform Admin</title>
</svelte:head>

<div class="dashboard">
  <div class="stats-grid">
    {#each statCards as stat}
      <div class="stat-card {stat.color}">
        <div class="stat-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        </div>
        <div class="stat-content">
          <span class="stat-value">{stat.value}</span>
          <span class="stat-label">{stat.label}</span>
        </div>
      </div>
    {/each}
  </div>
  
  <div class="dashboard-grid">
    <div class="card">
      <div class="card-header">
        <h3>Quick Stats</h3>
        <a href="/admin/agents" class="card-link">View All</a>
      </div>
      <div class="card-content">
        <div class="quick-stat">
          <span class="qs-label">Active Agents</span>
          <span class="qs-value">{$agentsStore.filter(a => a.isActive).length}</span>
        </div>
        <div class="quick-stat">
          <span class="qs-label">Models</span>
          <span class="qs-value">{activeModels.length}</span>
        </div>
        <div class="quick-stat">
          <span class="qs-label">Knowledge Bases</span>
          <span class="qs-value">{$knowledgeBasesStore.filter(kb => kb.isActive).length}</span>
        </div>
        <div class="quick-stat">
          <span class="qs-label">MCP Servers</span>
          <span class="qs-value">{$mcpServersStore.filter(mcp => mcp.status === 'ACTIVE').length}</span>
        </div>
      </div>
    </div>
    
    <div class="card">
      <div class="card-header">
        <h3>Active Agents</h3>
        <a href="/admin/agents" class="card-link">View All</a>
      </div>
      <div class="card-content">
        {#each recentAgents as agent}
          <div class="agent-item">
            <div class="agent-info">
              <span class="agent-name">{agent.name}</span>
              <span class="agent-desc">{agent.description || 'No description'}</span>
            </div>
            <span class="agent-status" class:active={agent.isActive}>Active</span>
          </div>
        {/each}
      </div>
    </div>
    
    <div class="card">
      <div class="card-header">
        <h3>System Status</h3>
      </div>
      <div class="card-content">
        <div class="system-status">
          <div class="status-item">
            <span class="status-dot green"></span>
            <span>API Gateway</span>
            <span class="status-badge OK">OK</span>
          </div>
          <div class="status-item">
            <span class="status-dot green"></span>
            <span>NATS</span>
            <span class="status-badge OK">OK</span>
          </div>
          <div class="status-item">
            <span class="status-dot green"></span>
            <span>PostgreSQL</span>
            <span class="status-badge OK">OK</span>
          </div>
          <div class="status-item">
            <span class="status-dot green"></span>
            <span>Redis</span>
            <span class="status-badge OK">OK</span>
          </div>
          <div class="status-item">
            <span class="status-dot green"></span>
            <span>VictoriaMetrics</span>
            <span class="status-badge OK">OK</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>

<style>
  .dashboard {
    display: flex;
    flex-direction: column;
    gap: 24px;
  }
  
  .stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 16px;
  }
  
  .stat-card {
    background: hsl(var(--card));
    border: 1px solid hsl(var(--border));
    border-radius: 12px;
    padding: 20px;
    display: flex;
    align-items: center;
    gap: 16px;
  }
  
  .stat-icon {
    width: 48px;
    height: 48px;
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  
  .stat-icon svg {
    width: 24px;
    height: 24px;
  }
  
  .stat-card.blue .stat-icon { background: #dbeafe; color: #2563eb; }
  .stat-card.green .stat-icon { background: #dcfce7; color: #16a34a; }
  .stat-card.purple .stat-icon { background: #f3e8ff; color: #9333ea; }
  .stat-card.orange .stat-icon { background: #ffedd5; color: #ea580c; }
  .stat-card.red .stat-icon { background: #fee2e2; color: #dc2626; }
  .stat-card.cyan .stat-icon { background: #cffafe; color: #0891b2; }
  
  .stat-content {
    display: flex;
    flex-direction: column;
  }
  
  .stat-value {
    font-size: 24px;
    font-weight: 700;
    color: hsl(var(--foreground));
  }
  
  .stat-label {
    font-size: 14px;
    color: hsl(var(--muted-foreground));
  }
  
  .dashboard-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 16px;
  }
  
  .card {
    background: hsl(var(--card));
    border: 1px solid hsl(var(--border));
    border-radius: 12px;
    overflow: hidden;
  }
  
  .card-header {
    padding: 16px 20px;
    border-bottom: 1px solid hsl(var(--border));
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  
  .card-header h3 {
    font-size: 16px;
    font-weight: 600;
  }
  
  .card-link {
    font-size: 14px;
    color: hsl(var(--primary));
    text-decoration: none;
  }
  
  .card-link:hover {
    text-decoration: underline;
  }
  
  .card-content {
    padding: 16px 20px;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  
  .quick-stat {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 8px 0;
    border-bottom: 1px solid hsl(var(--border));
  }
  
  .qs-label {
    font-size: 14px;
    color: hsl(var(--muted-foreground));
  }
  
  .qs-value {
    font-size: 14px;
    font-weight: 600;
  }
  
  .agent-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 8px 0;
    border-bottom: 1px solid hsl(var(--border));
  }
  
  .agent-info {
    display: flex;
    flex-direction: column;
  }
  
  .agent-name {
    font-size: 14px;
    font-weight: 500;
  }
  
  .agent-desc {
    font-size: 12px;
    color: hsl(var(--muted-foreground));
  }
  
  .agent-status {
    font-size: 12px;
    color: hsl(var(--muted-foreground));
  }
  
  .agent-status.active {
    color: #16a34a;
  }
  
  .system-status {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  
  .status-item {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 14px;
  }
  
  .status-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
  }
  
  .status-dot.green {
    background: #16a34a;
  }
  
  .status-badge {
    margin-left: auto;
    font-size: 12px;
    padding: 2px 8px;
    border-radius: 4px;
    background: #dcfce7;
    color: #16a34a;
  }
</style>