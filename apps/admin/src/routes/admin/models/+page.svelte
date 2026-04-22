<script lang="ts">
  // ============================================================================
  // Admin Models Page
  // ============================================================================
  
  import { modelsStore } from '$lib/stores';
  
  let searchQuery = $state('');
  let selectedProvider = $state<string>('all');
  let selectedModality = $state<string>('all');
  
  let filteredModels = $derived(
    $modelsStore.filter(model => {
      const matchesSearch = !searchQuery || 
        model.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesProvider = selectedProvider === 'all' || model.provider === selectedProvider;
      const matchesModality = selectedModality === 'all' || model.modality === selectedModality;
      return matchesSearch && matchesProvider && matchesModality;
    })
  );
</script>

<svelte:head>
  <title>Models | LLM Platform Admin</title>
</svelte:head>

<div class="page">
  <div class="page-header">
    <div class="header-left">
      <h1>Models</h1>
      <span class="count">{filteredModels.length} models</span>
    </div>
    
    <div class="header-actions">
      <div class="search-box">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" class="search-icon">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input 
          type="text" 
          placeholder="Search models..." 
          bind:value={searchQuery}
        />
      </div>
      
      <select bind:value={selectedProvider}>
        <option value="all">All Providers</option>
        <option value="OPENAI">OpenAI</option>
        <option value="ANTHROPIC">Anthropic</option>
        <option value="GROQ">Groq</option>
        <option value="LOCAL">Local</option>
      </select>
      
      <select bind:value={selectedModality}>
        <option value="all">All Types</option>
        <option value="CHAT">Chat</option>
        <option value="EMBEDDINGS">Embeddings</option>
        <option value="RERANK">Rerank</option>
        <option value="VISION">Vision</option>
      </select>
      
      <button class="btn-primary">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
        </svg>
        Add Model
      </button>
    </div>
  </div>
  
  <div class="table-card">
    <table class="data-table">
      <thead>
        <tr>
          <th>Model</th>
          <th>Provider</th>
          <th>Type</th>
          <th>Endpoint</th>
          <th>Pricing</th>
          <th>Status</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        {#each filteredModels as model}
          <tr>
            <td>
              <div class="model-cell">
                <span class="model-name">{model.name}</span>
                {#if model.isDefault}
                  <span class="default-badge">Default</span>
                {/if}
              </div>
            </td>
            <td>
              <span class="provider-badge {model.provider.toLowerCase()}">{model.provider}</span>
            </td>
            <td>
              <span class="modality-badge">{model.modality}</span>
            </td>
            <td>
              <span class="endpoint">{model.endpoint || '-'}</span>
            </td>
            <td>
              {#if model.pricing}
                <div class="pricing">
                  <span>In: ${model.pricing.input}/1k</span>
                  <span>Out: ${model.pricing.output}/1k</span>
                </div>
              {:else}
                <span class="text-muted">-</span>
              {/if}
            </td>
            <td>
              <span class="status-badge {model.isActive ? 'active' : 'inactive'}">
                {model.isActive ? 'Active' : 'Inactive'}
              </span>
            </td>
            <td>
              <div class="row-actions">
                <button class="action-btn" title="Edit">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
                <button class="action-btn" title="Delete">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </td>
          </tr>
        {/each}
      </tbody>
    </table>
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
    display: flex;
    align-items: center;
  }
  
  .search-icon {
    position: absolute;
    left: 12px;
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
  
  .search-box input:focus {
    outline: none;
    border-color: hsl(var(--primary));
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
  
  .table-card {
    background: hsl(var(--card));
    border: 1px solid hsl(var(--border));
    border-radius: 12px;
    overflow: hidden;
  }
  
  .data-table {
    width: 100%;
    border-collapse: collapse;
  }
  
  .data-table th,
  .data-table td {
    padding: 12px 16px;
    text-align: left;
    border-bottom: 1px solid hsl(var(--border));
  }
  
  .data-table th {
    font-size: 12px;
    font-weight: 600;
    color: hsl(var(--muted-foreground));
    text-transform: uppercase;
    background: hsl(var(--accent));
  }
  
  .model-cell {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  
  .model-name {
    font-weight: 500;
  }
  
  .default-badge {
    padding: 2px 8px;
    background: hsl(var(--primary));
    color: hsl(var(--primary-foreground));
    border-radius: 4px;
    font-size: 11px;
    font-weight: 600;
  }
  
  .provider-badge {
    display: inline-block;
    padding: 4px 8px;
    border-radius: 4px;
    font-size: 12px;
    font-weight: 500;
  }
  
  .provider-badge.openai {
    background: #dbeafe;
    color: #1d4ed8;
  }
  
  .provider-badge.anthropic {
    background: #fef3c7;
    color: #b45309;
  }
  
  .provider-badge.groq {
    background: #e0e7ff;
    color: #4338ca;
  }
  
  .provider-badge.local {
    background: #d1fae5;
    color: #047857;
  }
  
  .modality-badge {
    padding: 4px 8px;
    background: hsl(var(--accent));
    border-radius: 4px;
    font-size: 12px;
  }
  
  .endpoint {
    font-size: 13px;
    color: hsl(var(--muted-foreground));
    max-width: 200px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    display: block;
  }
  
  .pricing {
    display: flex;
    flex-direction: column;
    font-size: 13px;
  }
  
  .text-muted {
    color: hsl(var(--muted-foreground));
  }
  
  .status-badge {
    display: inline-block;
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
  
  .row-actions {
    display: flex;
    gap: 4px;
    justify-content: flex-end;
  }
  
  .action-btn {
    width: 32px;
    height: 32px;
    border: none;
    background: transparent;
    border-radius: 6px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    color: hsl(var(--muted-foreground));
  }
  
  .action-btn:hover {
    background: hsl(var(--accent));
    color: hsl(var(--foreground));
  }
  
  .action-btn svg {
    width: 16px;
    height: 16px;
  }
</style>