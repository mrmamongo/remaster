<script lang="ts">
  // ============================================================================
  // Admin Traces Page
  // ============================================================================
  
  import { mockTraces } from '$lib/mocks';
  
  let selectedTrace = $state<string | null>(null);
  
  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };
</script>

<svelte:head>
  <title>Traces | LLM Platform Admin</title>
</svelte:head>

<div class="page">
  <div class="page-header">
    <div class="header-left">
      <h1>Traces</h1>
      <span class="count">{mockTraces.length} traces</span>
    </div>
  </div>
  
  <div class="traces-layout">
    <div class="traces-sidebar">
      <div class="sidebar-header">
        <span>Trace List</span>
      </div>
      
      <div class="traces-list">
        {#each mockTraces as trace}
          <button 
            class="trace-item"
            class:active={selectedTrace === trace.traceID}
            onclick={() => selectedTrace = trace.traceID}
          >
            <div class="trace-id">{trace.traceID}</div>
            <div class="trace-spans-count">
              {trace.spans.length} spans
            </div>
          </button>
        {/each}
      </div>
    </div>
    
    <div class="traces-detail">
      {#if selectedTrace}
        {@const trace = mockTraces.find(t => t.traceID === selectedTrace)}
        {#if trace}
          <div class="detail-header">
            <h3>Trace: {trace.traceID}</h3>
          </div>
          
          <div class="spans-timeline">
            {#each trace.spans as span}
              <div class="span-row">
                <div class="span-info">
                  <span class="span-name">{span.operationName}</span>
                  <span class="span-duration">{formatDuration(span.duration)}</span>
                </div>
                <div class="span-bar-container">
                  <div 
                    class="span-bar"
                    style="width: {Math.min(100, span.duration / 50)}%"
                  ></div>
                </div>
                <div class="span-status">
                  {#if span.status.code === 0}
                    <span class="status-ok">OK</span>
                  {:else}
                    <span class="status-error">Error</span>
                  {/if}
                </div>
              </div>
            {/each}
          </div>
        {/if}
      {:else}
        <div class="empty-state">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          <p>Select a trace to view details</p>
        </div>
      {/if}
    </div>
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
  
  .traces-layout {
    display: grid;
    grid-template-columns: 300px 1fr;
    gap: 16px;
    min-height: 500px;
  }
  
  .traces-sidebar {
    background: hsl(var(--card));
    border: 1px solid hsl(var(--border));
    border-radius: 12px;
    overflow: hidden;
  }
  
  .sidebar-header {
    padding: 16px;
    border-bottom: 1px solid hsl(var(--border));
    font-weight: 600;
  }
  
  .traces-list {
    max-height: 450px;
    overflow-y: auto;
  }
  
  .trace-item {
    display: flex;
    flex-direction: column;
    gap: 4px;
    width: 100%;
    padding: 12px 16px;
    border: none;
    background: transparent;
    cursor: pointer;
    text-align: left;
    border-bottom: 1px solid hsl(var(--border));
  }
  
  .trace-item:hover {
    background: hsl(var(--accent));
  }
  
  .trace-item.active {
    background: hsl(var(--primary));
    color: hsl(var(--primary-foreground));
  }
  
  .trace-id {
    font-family: 'Monaco', 'Menlo', monospace;
    font-size: 13px;
    font-weight: 500;
  }
  
  .trace-spans-count {
    font-size: 12px;
    color: hsl(var(--muted-foreground));
  }
  
  .trace-item.active .trace-spans-count {
    color: hsl(var(--primary-foreground));
    opacity: 0.8;
  }
  
  .traces-detail {
    background: hsl(var(--card));
    border: 1px solid hsl(var(--border));
    border-radius: 12px;
    overflow: hidden;
  }
  
  .detail-header {
    padding: 16px 20px;
    border-bottom: 1px solid hsl(var(--border));
  }
  
  .detail-header h3 {
    font-size: 16px;
    font-weight: 600;
  }
  
  .spans-timeline {
    padding: 20px;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  
  .span-row {
    display: flex;
    align-items: center;
    gap: 16px;
  }
  
  .span-info {
    width: 200px;
    display: flex;
    flex-direction: column;
  }
  
  .span-name {
    font-size: 14px;
    font-weight: 500;
  }
  
  .span-duration {
    font-size: 12px;
    color: hsl(var(--muted-foreground));
  }
  
  .span-bar-container {
    flex: 1;
    height: 24px;
    background: hsl(var(--accent));
    border-radius: 4px;
    overflow: hidden;
  }
  
  .span-bar {
    height: 100%;
    background: hsl(var(--primary));
    border-radius: 4px;
  }
  
  .span-status {
    width: 60px;
  }
  
  .status-ok {
    font-size: 12px;
    padding: 2px 8px;
    background: #dcfce7;
    color: #16a34a;
    border-radius: 4px;
  }
  
  .status-error {
    font-size: 12px;
    padding: 2px 8px;
    background: #fee2e2;
    color: #dc2626;
    border-radius: 4px;
  }
  
  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100%;
    padding: 40px;
    color: hsl(var(--muted-foreground));
  }
  
  .empty-state svg {
    width: 48px;
    height: 48px;
    margin-bottom: 16px;
  }
  
  .empty-state p {
    font-size: 14px;
  }
</style>