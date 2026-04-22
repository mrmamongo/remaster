<script lang="ts">
  // ============================================================================
  // Admin Metrics Page
  // ============================================================================
  
  import { metricsStore } from '$lib/stores';
  
  let timeRange = $state('1h');
  
  const demoMetrics = [
    { name: 'API Requests', value: '12.5K', change: '+5.2%', positive: true },
    { name: 'LLM Requests', value: '8.2K', change: '+12.1%', positive: true },
    { name: 'Avg Latency', value: '1.2s', change: '-8.3%', positive: true },
    { name: 'Error Rate', value: '0.5%', change: '+0.1%', positive: false },
    { name: 'Tokens Used', value: '2.5M', change: '+15.3%', positive: true },
    { name: 'Active Users', value: '42', change: '+3', positive: true }
  ];
</script>

<svelte:head>
  <title>Metrics | LLM Platform Admin</title>
</svelte:head>

<div class="page">
  <div class="page-header">
    <div class="header-left">
      <h1>Metrics</h1>
    </div>
    
    <div class="header-actions">
      <select bind:value={timeRange}>
        <option value="15m">Last 15 minutes</option>
        <option value="1h">Last hour</option>
        <option value="24h">Last 24 hours</option>
        <option value="7d">Last 7 days</option>
      </select>
      
      <button class="btn-secondary">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
        </svg>
        Export
      </button>
    </div>
  </div>
  
  <div class="metrics-grid">
    {#each demoMetrics as metric}
      <div class="metric-card">
        <div class="metric-header">
          <span class="metric-name">{metric.name}</span>
          <span class="metric-change" class:positive={metric.positive} class:negative={!metric.positive}>
            {metric.change}
          </span>
        </div>
        <div class="metric-value">{metric.value}</div>
        <div class="metric-sparkline">
          <svg viewBox="0 0 100 30" preserveAspectRatio="none">
            <path 
              d="M0,25 L10,20 L20,22 L30,15 L40,18 L50,10 L60,12 L70,8 L80,5 L90,7 L100,3" 
              fill="none" 
              stroke="hsl(var(--primary))" 
              stroke-width="2"
            />
          </svg>
        </div>
      </div>
    {/each}
  </div>
  
  <div class="charts-section">
    <div class="chart-card">
      <div class="chart-header">
        <h3>API Requests Over Time</h3>
      </div>
      <div class="chart-body">
        <div class="chart-placeholder">
          <svg viewBox="0 0 400 200" preserveAspectRatio="none">
            <path 
              d="M0,150 Q50,140 100,120 T200,80 T300,60 T400,40" 
              fill="none" 
              stroke="hsl(var(--primary))" 
              stroke-width="2"
            />
            <path 
              d="M0,150 Q50,140 100,120 T200,80 T300,60 T400,40 L400,200 L0,200 Z" 
              fill="url(#gradient)" 
              opacity="0.2"
            />
            <defs>
              <linearGradient id="gradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stop-color="hsl(var(--primary))" />
                <stop offset="100%" stop-color="transparent" />
              </linearGradient>
            </defs>
          </svg>
        </div>
      </div>
    </div>
    
    <div class="chart-card">
      <div class="chart-header">
        <h3>LLM Latency Distribution</h3>
      </div>
      <div class="chart-body">
        <div class="chart-placeholder bar-chart">
          <div class="bar" style="height: 60%"><span>60%</span></div>
          <div class="bar" style="height: 80%"><span>80%</span></div>
          <div class="bar" style="height: 45%"><span>45%</span></div>
          <div class="bar" style="height: 30%"><span>30%</span></div>
          <div class="bar" style="height: 15%"><span>15%</span></div>
        </div>
      </div>
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
  
  .header-left h1 {
    font-size: 24px;
    font-weight: 700;
  }
  
  .header-actions {
    display: flex;
    align-items: center;
    gap: 12px;
  }
  
  select {
    padding: 10px 12px;
    border: 1px solid hsl(var(--border));
    border-radius: 8px;
    background: hsl(var(--background));
    font-size: 14px;
  }
  
  .btn-secondary {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 16px;
    background: hsl(var(--accent));
    color: hsl(var(--foreground));
    border: none;
    border-radius: 8px;
    font-size: 14px;
    cursor: pointer;
  }
  
  .btn-secondary svg {
    width: 18px;
    height: 18px;
  }
  
  .metrics-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 16px;
  }
  
  .metric-card {
    background: hsl(var(--card));
    border: 1px solid hsl(var(--border));
    border-radius: 12px;
    padding: 20px;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  
  .metric-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  
  .metric-name {
    font-size: 14px;
    color: hsl(var(--muted-foreground));
  }
  
  .metric-change {
    font-size: 12px;
    font-weight: 500;
    padding: 2px 6px;
    border-radius: 4px;
  }
  
  .metric-change.positive {
    background: #dcfce7;
    color: #16a34a;
  }
  
  .metric-change.negative {
    background: #fee2e2;
    color: #dc2626;
  }
  
  .metric-value {
    font-size: 28px;
    font-weight: 700;
  }
  
  .metric-sparkline {
    height: 30px;
    margin-top: 8px;
  }
  
  .metric-sparkline svg {
    width: 100%;
    height: 100%;
  }
  
  .charts-section {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 16px;
  }
  
  .chart-card {
    background: hsl(var(--card));
    border: 1px solid hsl(var(--border));
    border-radius: 12px;
    overflow: hidden;
  }
  
  .chart-header {
    padding: 16px 20px;
    border-bottom: 1px solid hsl(var(--border));
  }
  
  .chart-header h3 {
    font-size: 16px;
    font-weight: 600;
  }
  
  .chart-body {
    padding: 20px;
    min-height: 250px;
  }
  
  .chart-placeholder {
    width: 100%;
    height: 200px;
  }
  
  .chart-placeholder svg {
    width: 100%;
    height: 100%;
  }
  
  .bar-chart {
    display: flex;
    align-items: flex-end;
    justify-content: space-around;
    gap: 16px;
    height: 200px;
  }
  
  .bar {
    width: 40px;
    background: hsl(var(--primary));
    border-radius: 4px 4px 0 0;
    display: flex;
    align-items: flex-start;
    justify-content: center;
    padding-top: 8px;
  }
  
  .bar span {
    font-size: 12px;
    color: hsl(var(--primary-foreground));
  }
</style>