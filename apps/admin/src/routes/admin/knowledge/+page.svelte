<script lang="ts">
  // ============================================================================
  // Admin Knowledge Bases Page
  // ============================================================================
  
  import { knowledgeBasesStore, modelsStore } from '$lib/stores';
  
  let searchQuery = $state('');
  
  let filteredKBs = $derived(
    $knowledgeBasesStore.filter(kb => {
      const matchesSearch = !searchQuery || 
        kb.name.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesSearch;
    })
  );
  
  const embeddingModels = $derived($modelsStore.filter(m => m.modality === 'EMBEDDINGS' && m.isActive));
</script>

<svelte:head>
  <title>Knowledge Bases | LLM Platform Admin</title>
</svelte:head>

<div class="page">
  <div class="page-header">
    <div class="header-left">
      <h1>Knowledge Bases</h1>
      <span class="count">{filteredKBs.length} bases</span>
    </div>
    
    <div class="header-actions">
      <div class="search-box">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" class="search-icon">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input 
          type="text" 
          placeholder="Search knowledge bases..." 
          bind:value={searchQuery}
        />
      </div>
      
      <button class="btn-primary">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
        </svg>
        Add Knowledge Base
      </button>
    </div>
  </div>
  
  <div class="kbs-grid">
    {#each filteredKBs as kb}
      {@const embeddingModel = $modelsStore.find(m => m.id === kb.embeddingModelId)}
      <div class="kb-card">
        <div class="kb-header">
          <h3>{kb.name}</h3>
          <span class="status-badge {kb.isActive ? 'active' : 'inactive'}">
            {kb.isActive ? 'Active' : 'Inactive'}
          </span>
        </div>
        
        <div class="kb-body">
          <div class="kb-field">
            <span class="field-label">Search Methods</span>
            <div class="field-value">
              {#each kb.searchMethods as method}
                <span class="method-tag">{method}</span>
              {/each}
            </div>
          </div>
          
          <div class="kb-field">
            <span class="field-label">Embedding Model</span>
            <span class="field-value">{embeddingModel?.name || '-'}</span>
          </div>
          
          <div class="kb-field">
            <span class="field-label">Chunk Size</span>
            <span class="field-value">{kb.chunkSize}</span>
          </div>
          
          <div class="kb-field">
            <span class="field-label">Chunk Overlap</span>
            <span class="field-value">{kb.chunkOverlap}</span>
          </div>
          
          <div class="kb-field">
            <span class="field-label">Top K</span>
            <span class="field-value">{kb.topK}</span>
          </div>
        </div>
        
        <div class="kb-footer">
          <button class="btn-secondary">Edit</button>
          <button class="btn-secondary">Documents</button>
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
  
  .kbs-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
    gap: 16px;
  }
  
  .kb-card {
    background: hsl(var(--card));
    border: 1px solid hsl(var(--border));
    border-radius: 12px;
    overflow: hidden;
  }
  
  .kb-header {
    padding: 16px 20px;
    border-bottom: 1px solid hsl(var(--border));
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  
  .kb-header h3 {
    font-size: 16px;
    font-weight: 600;
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
  
  .kb-body {
    padding: 16px 20px;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  
  .kb-field {
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
  
  .method-tag {
    padding: 2px 8px;
    background: hsl(var(--accent));
    border-radius: 4px;
    font-size: 12px;
    margin-left: 4px;
  }
  
  .kb-footer {
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
</style>