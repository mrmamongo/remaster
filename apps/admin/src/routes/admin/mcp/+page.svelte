<script lang="ts">
  // ============================================================================
  // Admin MCP Servers Page
  // ============================================================================
  
  import { mcpServersStore } from '$lib/stores';
  
  let searchQuery = $state('');
  let selectedStatus = $state<string>('all');
  
  let filteredServers = $derived(
    $mcpServersStore.filter(server => {
      const matchesSearch = !searchQuery || 
        server.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        server.url.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = selectedStatus === 'all' || server.status === selectedStatus;
      return matchesSearch && matchesStatus;
    })
  );
</script>

<svelte:head>
  <title>MCP Servers | LLM Platform Admin</title>
</svelte:head>

<div class="page">
  <div class="page-header">
    <div class="header-left">
      <h1>MCP Servers</h1>
      <span class="count">{filteredServers.length} servers</span>
    </div>
    
    <div class="header-actions">
      <div class="search-box">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" class="search-icon">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input 
          type="text" 
          placeholder="Search servers..." 
          bind:value={searchQuery}
        />
      </div>
      
      <select bind:value={selectedStatus}>
        <option value="all">All Status</option>
        <option value="ACTIVE">Active</option>
        <option value="INACTIVE">Inactive</option>
        <option value="ERROR">Error</option>
      </select>
      
      <button class="btn-primary">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
        </svg>
        Add Server
      </button>
    </div>
  </div>
  
  <div class="servers-grid">
    {#each filteredServers as server}
      <div class="server-card">
        <div class="server-header">
          <div class="server-title">
            <h3>{server.name}</h3>
            <span class="status-dot {server.status.toLowerCase()}"></span>
          </div>
          <span class="status-badge {server.status.toLowerCase()}">{server.status}</span>
        </div>
        
        <div class="server-body">
          <div class="server-field">
            <span class="field-label">URL</span>
            <span class="field-value">{server.url}</span>
          </div>
          
          <div class="server-field">
            <span class="field-label">Auth Type</span>
            <span class="field-value">{server.authType}</span>
          </div>
          
          <div class="server-field">
            <span class="field-label">Owner</span>
            <span class="field-value">{server.ownerId}</span>
          </div>
        </div>
        
        <div class="server-footer">
          <button class="btn-secondary">Test Connection</button>
          <button class="btn-secondary">Edit</button>
          <button class="btn-danger">Delete</button>
        </div>
      </div>
    {/each}
  </div>
</div>

<style>
  .page {
    display: flex;
    flex-direction: column;
    gap: 24px;
  }
  
  .page-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  
  .header-left {
    display: flex;
    align-items: baseline;
    gap: 12px;
  }
  
  .header-left h1 {
    font-size: 24px;
    font-weight: 700;
  }
  
  .count {
    font-size: 14px;
    color: hsl(var(--muted-foreground));
  }
  
  .header-actions {
    display: flex;
    align-items: center;
    gap: 12px;
  }
  
  .search-box {
    position: relative;
  }
  
  .search-icon {
    position: absolute;
    left: 12px;
    top: 50%;
    transform: translateY(-50%);
    width: 18px;
    height: 18px;
    color: hsl(var(--muted-foreground));
  }
  
  .search-box input {
    padding: 10px 12px 10px 40px;
    border: 1px solid hsl(var(--border));
    border-radius: 8px;
    background: hsl(var(--background));
    width: 280px;
    font-size: 14px;
  }
  
  select {
    padding: 10px 12px;
    border: 1px solid hsl(var(--border));
    border-radius: 8px;
    background: hsl(var(--background));
    font-size: 14px;
  }
  
  .btn-primary {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 16px;
    background: hsl(var(--primary));
    color: hsl(var(--primary-foreground));
    border: none;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
  }
  
  .btn-primary svg {
    width: 18px;
    height: 18px;
  }
  
  .servers-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
    gap: 16px;
  }
  
  .server-card {
    background: hsl(var(--card));
    border: 1px solid hsl(var(--border));
    border-radius: 12px;
    overflow: hidden;
  }
  
  .server-header {
    padding: 16px 20px;
    border-bottom: 1px solid hsl(var(--border));
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  
  .server-title {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  
  .server-title h3 {
    font-size: 16px;
    font-weight: 600;
  }
  
  .status-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
  }
  
  .status-dot.active {
    background: #16a34a;
  }
  
  .status-dot.inactive {
    background: #6b7280;
  }
  
  .status-dot.error {
    background: #dc2626;
  }
  
  .status-badge {
    padding: 4px 8px;
    border-radius: 4px;
    font-size: 12px;
    font-weight: 500;
  }
  
  .status-badge.active {
    background: #dcfce7;
    color: #16a34a;
  }
  
  .status-badge.inactive {
    background: #f3f4f6;
    color: #6b7280;
  }
  
  .status-badge.error {
    background: #fee2e2;
    color: #dc2626;
  }
  
  .server-body {
    padding: 16px 20px;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  
  .server-field {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  
  .field-label {
    font-size: 14px;
    color: hsl(var(--muted-foreground));
  }
  
  .field-value {
    font-size: 14px;
    font-weight: 500;
  }
  
  .server-footer {
    padding: 12px 20px;
    border-top: 1px solid hsl(var(--border));
    display: flex;
    gap: 8px;
  }
  
  .btn-secondary {
    padding: 8px 16px;
    background: hsl(var(--accent));
    color: hsl(var(--foreground));
    border: none;
    border-radius: 6px;
    font-size: 14px;
    cursor: pointer;
  }
  
  .btn-secondary:hover {
    background: hsl(var(--muted));
  }
  
  .btn-danger {
    padding: 8px 16px;
    background: #fee2e2;
    color: #dc2626;
    border: none;
    border-radius: 6px;
    font-size: 14px;
    cursor: pointer;
  }
  
  .btn-danger:hover {
    background: #fecaca;
  }
</style>