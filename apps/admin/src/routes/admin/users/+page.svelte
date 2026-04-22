<script lang="ts">
  // ============================================================================
  // Admin Users Page
  // ============================================================================
  
  import { usersStore, userGroupsStore } from '$lib/stores';
  
  let searchQuery = $state('');
  let selectedStatus = $state<string>('all');
  
  let filteredUsers = $derived(
    $usersStore.filter(user => {
      const matchesSearch = !searchQuery || 
        user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.displayName?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = selectedStatus === 'all' || user.status === selectedStatus;
      return matchesSearch && matchesStatus;
    })
  );
</script>

<svelte:head>
  <title>Users | LLM Platform Admin</title>
</svelte:head>

<div class="page">
  <div class="page-header">
    <div class="header-left">
      <h1>Users</h1>
      <span class="count">{filteredUsers.length} users</span>
    </div>
    
    <div class="header-actions">
      <div class="search-box">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" class="search-icon">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input 
          type="text" 
          placeholder="Search users..." 
          bind:value={searchQuery}
        />
      </div>
      
      <select bind:value={selectedStatus}>
        <option value="all">All Status</option>
        <option value="ACTIVE">Active</option>
        <option value="SUSPENDED">Suspended</option>
        <option value="DELETED">Deleted</option>
      </select>
      
      <button class="btn-primary">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
        </svg>
        Add User
      </button>
    </div>
  </div>
  
  <div class="table-card">
    <table class="data-table">
      <thead>
        <tr>
          <th>User</th>
          <th>Email</th>
          <th>Status</th>
          <th>Groups</th>
          <th>Created</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        {#each filteredUsers as user}
          {@const userGroups = $userGroupsStore.filter(g => g.members.some(m => m.userId === user.id))}
          <tr>
            <td>
              <div class="user-cell">
                <div class="user-avatar">
                  {user.displayName?.charAt(0) || user.email.charAt(0).toUpperCase()}
                </div>
                <span class="user-name">{user.displayName || 'No name'}</span>
              </div>
            </td>
            <td>{user.email}</td>
            <td>
              <span class="status-badge {user.status.toLowerCase()}">{user.status}</span>
            </td>
            <td>
              <div class="groups-list">
                {#each userGroups as group}
                  <span class="group-tag">{group.name}</span>
                {/each}
              </div>
            </td>
            <td>{new Date(user.createdAt).toLocaleDateString()}</td>
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
  
  .data-table tr:last-child td {
    border-bottom: none;
  }
  
  .user-cell {
    display: flex;
    align-items: center;
    gap: 12px;
  }
  
  .user-avatar {
    width: 36px;
    height: 36px;
    border-radius: 50%;
    background: hsl(var(--primary));
    color: hsl(var(--primary-foreground));
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 600;
    font-size: 14px;
  }
  
  .user-name {
    font-weight: 500;
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
  
  .status-badge.suspended {
    background: #ffedd5;
    color: #ea580c;
  }
  
  .status-badge.deleted {
    background: #fee2e2;
    color: #dc2626;
  }
  
  .groups-list {
    display: flex;
    gap: 4px;
    flex-wrap: wrap;
  }
  
  .group-tag {
    padding: 2px 8px;
    background: hsl(var(--accent));
    border-radius: 4px;
    font-size: 12px;
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