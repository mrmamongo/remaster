<script lang="ts">
  import '../app.css';
  import QueryProvider from '$lib/providers/QueryProvider.svelte';
</script>

<QueryProvider>
  <slot />
</QueryProvider>