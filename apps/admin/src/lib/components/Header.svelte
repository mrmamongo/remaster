<script lang="ts">
  // ============================================================================
  // Header Component
  // ============================================================================
  
  import { page } from '$app/stores';
  import { authStore } from '$lib/stores';
  
  const breadcrumbLabels: Record<string, string> = {
    '/admin': 'Dashboard',
    '/admin/users': 'Users',
    '/admin/chats': 'Chats',
    '/admin/agents': 'Agents',
    '/admin/models': 'Models',
    '/admin/knowledge': 'Knowledge Bases',
    '/admin/mcp': 'MCP Servers',
    '/admin/settings': 'Settings',
    '/metrics': 'Metrics',
    '/logs': 'Logs',
    '/traces': 'Traces'
  };
  
  let currentPath = $derived($page.url.pathname);
  let currentTitle = $derived(breadcrumbLabels[currentPath] || 'Admin');
</script>

<header class="header">
  <div class="header-left">
    <nav class="breadcrumb">
      <span class="crumb">Admin</span>
      <span class="crumb-sep">/</span>
      <span class="crumb current">{currentTitle}</span>
    </nav>
  </div>
  
  <div class="header-right">
    <div class="header-actions">
      <button class="action-btn" title="Refresh">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
      </button>
      
      <button class="action-btn" title="Notifications">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
      </button>
    </div>
    
    <div class="user-menu">
      <div class="user-avatar">
        {$authStore.user?.displayName?.charAt(0) || 'A'}
      </div>
      <div class="user-info">
        <span class="user-name">{$authStore.user?.displayName}</span>
        <span class="user-email">{$authStore.user?.email}</span>
      </div>
    </div>
  </div>
</header>

<style>
  .header {
    height: 64px;
    padding: 0 24px;
    background: hsl(var(--card));
    border-bottom: 1px solid hsl(var(--border));
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  
  .header-left {
    display: flex;
    align-items: center;
  }
  
  .breadcrumb {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 14px;
  }
  
  .crumb {
    color: hsl(var(--muted-foreground));
  }
  
  .crumb-sep {
    color: hsl(var(--muted-foreground));
  }
  
  .crumb.current {
    color: hsl(var(--foreground));
    font-weight: 500;
  }
  
  .header-right {
    display: flex;
    align-items: center;
    gap: 24px;
  }
  
  .header-actions {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  
  .action-btn {
    width: 36px;
    height: 36px;
    border: none;
    background: transparent;
    border-radius: 8px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    color: hsl(var(--muted-foreground));
    transition: all 0.15s ease;
  }
  
  .action-btn:hover {
    background: hsl(var(--accent));
    color: hsl(var(--foreground));
  }
  
  .action-btn svg {
    width: 20px;
    height: 20px;
  }
  
  .user-menu {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 8px 12px;
    background: hsl(var(--accent));
    border-radius: 8px;
  }
  
  .user-avatar {
    width: 32px;
    height: 32px;
    background: hsl(var(--primary));
    color: hsl(var(--primary-foreground));
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 600;
    font-size: 14px;
  }
  
  .user-info {
    display: flex;
    flex-direction: column;
  }
  
  .user-name {
    font-size: 14px;
    font-weight: 500;
    color: hsl(var(--foreground));
  }
  
  .user-email {
    font-size: 12px;
    color: hsl(var(--muted-foreground));
  }
</style>