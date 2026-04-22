<script lang="ts">
  // ============================================================================
  // Admin Chats Page
  // ============================================================================
  
  import { chatsStore, agentsStore } from '$lib/stores';
  
  let searchQuery = $state('');
  
  let filteredChats = $derived(
    $chatsStore.filter(chat => {
      const matchesSearch = !searchQuery || 
        chat.name.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesSearch;
    })
  );
</script>

<svelte:head>
  <title>Chats | LLM Platform Admin</title>
</svelte:head>

<div class="page">
  <div class="page-header">
    <div class="header-left">
      <h1>Chats</h1>
      <span class="count">{filteredChats.length} chats</span>
    </div>
    
    <div class="header-actions">
      <div class="search-box">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" class="search-icon">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input 
          type="text" 
          placeholder="Search chats..." 
          bind:value={searchQuery}
        />
      </div>
    </div>
  </div>
  
  <div class="table-card">
    <table class="data-table">
      <thead>
        <tr>
          <th>Chat Name</th>
          <th>User ID</th>
          <th>Agent</th>
          <th>Created</th>
          <th>Updated</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        {#each filteredChats as chat}
          {@const agent = $agentsStore.find(a => a.id === chat.agentId)}
          <tr>
            <td>
              <div class="chat-cell">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" class="chat-icon">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.862 9.862 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                <span class="chat-name">{chat.name}</span>
              </div>
            </td>
            <td>
              <span class="user-id">{chat.userId}</span>
            </td>
            <td>
              <span class="agent-name">{agent?.name || '-'}</span>
            </td>
            <td>{new Date(chat.createdAt).toLocaleDateString()}</td>
            <td>{new Date(chat.updatedAt).toLocaleDateString()}</td>
            <td>
              <div class="row-actions">
                <button class="action-btn" title="View">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
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
  
  .chat-cell {
    display: flex;
    align-items: center;
    gap: 12px;
  }
  
  .chat-icon {
    width: 20px;
    height: 20px;
    color: hsl(var(--muted-foreground));
  }
  
  .chat-name {
    font-weight: 500;
  }
  
  .user-id,
  .agent-name {
    font-size: 13px;
    color: hsl(var(--muted-foreground));
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