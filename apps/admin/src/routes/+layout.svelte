<script lang="ts">
  // ============================================================================
  // Admin Layout
  // ============================================================================
  
  import type { Snippet } from 'svelte';
  import { page } from '$app/stores';
  import { uiStore } from '$lib/stores';
  
  import '../app.css';
  import QueryProvider from '$lib/providers/QueryProvider.svelte';
  import Sidebar from '$lib/components/Sidebar.svelte';
  import Header from '$lib/components/Header.svelte';
  
  interface Props {
    children: Snippet;
  }
  
  let { children }: Props = $props();
  
  const navItems = [
    { path: '/admin', label: 'Dashboard', icon: 'home' },
    { path: '/admin/users', label: 'Users', icon: 'users' },
    { path: '/admin/chats', label: 'Chats', icon: 'message' },
    { path: '/admin/agents', label: 'Agents', icon: 'bot' },
    { path: '/admin/models', label: 'Models', icon: 'cpu' },
    { path: '/admin/knowledge', label: 'Knowledge', icon: 'book' },
    { path: '/admin/mcp', label: 'MCP Servers', icon: 'server' },
    { path: '/admin/settings', label: 'Settings', icon: 'settings' },
    { path: '/metrics', label: 'Metrics', icon: 'chart' },
    { path: '/logs', label: 'Logs', icon: 'file' },
    { path: '/traces', label: 'Traces', icon: 'git' }
  ];
</script>

<QueryProvider>
  <div class="admin-layout">
    <Sidebar {navItems} />
    
    <div class="main-wrapper">
      <Header />
      
      <main class="main-content">
        {@render children()}
      </main>
    </div>
  </div>
</QueryProvider>

<style>
  .admin-layout {
    display: flex;
    min-height: 100vh;
    background: hsl(var(--background));
  }
  
  .main-wrapper {
    flex: 1;
    display: flex;
    flex-direction: column;
    margin-left: 260px;
    }
    
  .main-content {
    flex: 1;
    padding: 24px;
    overflow-y: auto;
  }
</style>