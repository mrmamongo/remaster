<script lang="ts">
  import { QueryClient, QueryClientProvider } from '@tanstack/svelte-query';
  import type { Snippet } from 'svelte';

  interface Props {
    children: Snippet;
  }

  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 1000 * 60 * 5,
        retry: 1
      }
    }
  });
</script>

<QueryClientProvider client={queryClient}>
  {@render children()}
</QueryClientProvider>