<script lang="ts">
  // ============================================================================
  // Sidebar Component
  // ============================================================================
  
  import { page } from '$app/stores';
  import { uiStore } from '$lib/stores';
  
  interface NavItem {
    path: string;
    label: string;
    icon: string;
  }
  
  interface Props {
    navItems: NavItem[];
  }
  
  let { navItems }: Props = $props();
  
  const icons: Record<string, string> = {
    home: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6',
    users: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z',
    message: 'M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.862 9.862 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z',
    bot: 'M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9z',
    cpu: 'M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9z',
    book: 'M12 6.253v13m0-13C10.832 5.477 9.846 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.154 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.154 5 15.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.846 18 15.5 18c-1.747 0-3.332.477-4.5 1.253',
    server: 'M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 12h.01M12 12h.01M7 12h.01',
    settings: 'M10.325 4.317c.3-3.286 2.341-5 5.675-5 3.333 0 5.375 1.714 5.675 5-3.286.3-5 2.341-5 5 0 3.333 1.714 5.375 5 5.675-.3-3.286-2.341-5-5.675-5-3.333 0-5.375-1.714-5.675-5 3.286-.3 5-2.341 5-5.675 0-3.333-1.714-5.375-5-5.675zM12 15h-1M12 9h1',
    chart: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z',
    file: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
    git: 'M6 3v12M18 9v3a3 3 0 01-3 3h-4a3 3 0 01-3-3V9M15 12v6m-9-6h.01M5 12h14a2 2 0 012 2v8a2 2 0 01-2 2H7a2 2 0 01-2-2v-8a2 2 0 012-2z'
  };
</script>

<aside class="sidebar">
  <div class="sidebar-header">
    <a href="/admin" class="logo">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" class="logo-icon">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3 3 0 1113 18h-1v-1.343l-.547-.547a5 5 0 00-7.072 0l-.548.547z" />
      </svg>
      <span>LLM Platform</span>
    </a>
  </div>
  
  <nav class="sidebar-nav">
    {#each navItems as item}
      <a 
        href={item.path} 
        class="nav-item"
        class:active={$page.url.pathname === item.path || $page.url.pathname.startsWith(item.path + '/')}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" class="nav-icon">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d={icons[item.icon] || icons['home']} />
        </svg>
        <span>{item.label}</span>
      </a>
    {/each}
  </nav>
  
  <div class="sidebar-footer">
    <div class="env-badge">
      <span class="env-dot"></span>
      <span>MOCK</span>
    </div>
  </div>
</aside>

<style>
  .sidebar {
    position: fixed;
    left: 0;
    top: 0;
    width: 260px;
    height: 100vh;
    background: hsl(var(--card));
    border-right: 1px solid hsl(var(--border));
    display: flex;
    flex-direction: column;
    z-index: 50;
  }
  
  .sidebar-header {
    padding: 20px;
    border-bottom: 1px solid hsl(var(--border));
  }
  
  .logo {
    display: flex;
    align-items: center;
    gap: 12px;
    text-decoration: none;
    color: hsl(var(--foreground));
    font-weight: 600;
    font-size: 18px;
  }
  
  .logo-icon {
    width: 28px;
    height: 28px;
    color: hsl(var(--primary));
  }
  
  .sidebar-nav {
    flex: 1;
    padding: 12px;
    overflow-y: auto;
  }
  
  .nav-item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 16px;
    border-radius: 8px;
    text-decoration: none;
    color: hsl(var(--muted-foreground));
    transition: all 0.15s ease;
    margin-bottom: 4px;
  }
  
  .nav-item:hover {
    background: hsl(var(--accent));
    color: hsl(var(--foreground));
  }
  
  .nav-item.active {
    background: hsl(var(--primary));
    color: hsl(var(--primary-foreground));
  }
  
  .nav-icon {
    width: 20px;
    height: 20px;
    flex-shrink: 0;
  }
  
  .sidebar-footer {
    padding: 16px 20px;
    border-top: 1px solid hsl(var(--border));
  }
  
  .env-badge {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 12px;
    font-weight: 600;
    color: hsl(var(--muted-foreground));
  }
  
  .env-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: hsl(var(--destructive));
  }
</style>