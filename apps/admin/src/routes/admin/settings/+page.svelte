<script lang="ts">
  // ============================================================================
  // Admin Settings Page
  // ============================================================================
  
  import { systemConfigStore } from '$lib/stores';
  
  let activeTab = $state('general');
  
  const tabs = [
    { id: 'general', label: 'General' },
    { id: 'models', label: 'Models' },
    { id: 'limits', label: 'Limits' },
    { id: 'security', label: 'Security' },
    { id: 'notifications', label: 'Notifications' }
  ];
  
  const generalSettings = $derived($systemConfigStore.filter(c => c.category === 'general'));
  const modelSettings = $derived($systemConfigStore.filter(c => c.category === 'models'));
  const limitSettings = $derived($systemConfigStore.filter(c => c.category === 'limits'));
</script>

<svelte:head>
  <title>Settings | LLM Platform Admin</title>
</svelte:head>

<div class="page">
  <div class="page-header">
    <h1>Settings</h1>
  </div>
  
  <div class="settings-layout">
    <div class="settings-sidebar">
      {#each tabs as tab}
        <button 
          class="tab-btn"
          class:active={activeTab === tab.id}
          onclick={() => activeTab = tab.id}
        >
          {tab.label}
        </button>
      {/each}
    </div>
    
    <div class="settings-content">
      {#if activeTab === 'general'}
        <div class="settings-section">
          <h3>General Settings</h3>
          <p class="section-desc">Configure general application settings</p>
          
          <div class="settings-form">
            <div class="form-group">
              <label>Application Name</label>
              <input type="text" value="LLM Platform" />
            </div>
            
            <div class="form-group">
              <label>Default Language</label>
              <select>
                <option>English</option>
                <option>Russian</option>
              </select>
            </div>
            
            <div class="form-group">
              <label>Timezone</label>
              <select>
                <option>UTC</option>
                <option>Europe/Moscow</option>
              </select>
            </div>
          </div>
        </div>
      {:else if activeTab === 'models'}
        <div class="settings-section">
          <h3>Model Settings</h3>
          <p class="section-desc">Configure default model behavior</p>
          
          <div class="settings-form">
            <div class="form-group">
              <label>Default Model</label>
              <select>
                <option>gpt-4</option>
                <option>claude-3-opus</option>
              </select>
            </div>
            
            <div class="form-group">
              <label>Default Temperature</label>
              <input type="number" value="0.7" step="0.1" min="0" max="2" />
            </div>
            
            <div class="form-group">
              <label>Max Tokens</label>
              <input type="number" value="4096" />
            </div>
          </div>
        </div>
      {:else if activeTab === 'limits'}
        <div class="settings-section">
          <h3>Rate Limits</h3>
          <p class="section-desc">Configure rate limiting for API requests</p>
          
          <div class="settings-form">
            <div class="form-group">
              <label>Requests per Minute</label>
              <input type="number" value="100" />
            </div>
            
            <div class="form-group">
              <label>Tokens per Minute</label>
              <input type="number" value="150000" />
            </div>
            
            <div class="form-group">
              <label>Max Concurrent Requests</label>
              <input type="number" value="10" />
            </div>
          </div>
        </div>
      {:else if activeTab === 'security'}
        <div class="settings-section">
          <h3>Security Settings</h3>
          <p class="section-desc">Configure security policies</p>
          
          <div class="settings-form">
            <div class="form-group">
              <label>Session Timeout (minutes)</label>
              <input type="number" value="60" />
            </div>
            
            <div class="form-group checkbox">
              <input type="checkbox" checked />
              <label>Require 2FA for all users</label>
            </div>
            
            <div class="form-group checkbox">
              <input type="checkbox" />
              <label>Enable IP whitelist</label>
            </div>
          </div>
        </div>
      {:else if activeTab === 'notifications'}
        <div class="settings-section">
          <h3>Notifications</h3>
          <p class="section-desc">Configure notification preferences</p>
          
          <div class="settings-form">
            <div class="form-group checkbox">
              <input type="checkbox" checked />
              <label>Email notifications</label>
            </div>
            
            <div class="form-group checkbox">
              <input type="checkbox" checked />
              <label>Error alerts</label>
            </div>
            
            <div class="form-group checkbox">
              <input type="checkbox" />
              <label>Weekly reports</label>
            </div>
          </div>
        </div>
      {/if}
      
      <div class="settings-footer">
        <button class="btn-secondary">Cancel</button>
        <button class="btn-primary">Save Changes</button>
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
  
  .page-header h1 {
    font-size: 24px;
    font-weight: 700;
  }
  
  .settings-layout {
    display: grid;
    grid-template-columns: 220px 1fr;
    gap: 24px;
  }
  
  .settings-sidebar {
    background: hsl(var(--card));
    border: 1px solid hsl(var(--border));
    border-radius: 12px;
    padding: 12px;
    height: fit-content;
  }
  
  .tab-btn {
    display: block;
    width: 100%;
    padding: 12px 16px;
    border: none;
    background: transparent;
    border-radius: 8px;
    text-align: left;
    font-size: 14px;
    color: hsl(var(--muted-foreground));
    cursor: pointer;
  }
  
  .tab-btn:hover {
    background: hsl(var(--accent));
    color: hsl(var(--foreground));
  }
  
  .tab-btn.active {
    background: hsl(var(--primary));
    color: hsl(var(--primary-foreground));
  }
  
  .settings-content {
    background: hsl(var(--card));
    border: 1px solid hsl(var(--border));
    border-radius: 12px;
    padding: 24px;
  }
  
  .settings-section h3 {
    font-size: 18px;
    font-weight: 600;
    margin-bottom: 4px;
  }
  
  .section-desc {
    font-size: 14px;
    color: hsl(var(--muted-foreground));
    margin-bottom: 24px;
  }
  
  .settings-form {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }
  
  .form-group {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  
  .form-group.checkbox {
    flex-direction: row;
    align-items: center;
    gap: 12px;
  }
  
  .form-group label {
    font-size: 14px;
    font-weight: 500;
  }
  
  .form-group input[type="text"],
  .form-group input[type="number"],
  .form-group select {
    padding: 10px 12px;
    border: 1px solid hsl(var(--border));
    border-radius: 8px;
    background: hsl(var(--background));
    font-size: 14px;
    max-width: 400px;
  }
  
  .form-group input[type="checkbox"] {
    width: 18px;
    height: 18px;
  }
  
  .settings-footer {
    display: flex;
    justify-content: flex-end;
    gap: 12px;
    margin-top: 24px;
    padding-top: 24px;
    border-top: 1px solid hsl(var(--border));
  }
  
  .btn-primary {
    padding: 10px 20px;
    background: hsl(var(--primary));
    color: hsl(var(--primary-foreground));
    border: none;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
  }
  
  .btn-secondary {
    padding: 10px 20px;
    background: hsl(var(--accent));
    color: hsl(var(--foreground));
    border: none;
    border-radius: 8px;
    font-size: 14px;
    cursor: pointer;
  }
</style>