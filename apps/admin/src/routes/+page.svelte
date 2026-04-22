<script lang="ts">
  import { redirect } from '@sveltejs/kit';
  
  // Redirect to admin dashboard
  throw redirect(302, '/admin');
</script>

Redirecting to admin...