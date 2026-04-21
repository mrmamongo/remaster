# Admin Panel

## Initialize shadcn-svelte

```bash
cd admin
npx shadcn-svelte init --preset bcivVKYS
```

## Available Routes (Admin)

| Route | Description |
|-------|-------------|
| `/` | Dashboard |
| `/users` | User management |
| `/groups` | Group management |
| `/agents` | Agent management |
| `/knowledge-bases` | KB management |
| `/mcp-servers` | MCP server management |
| `/mcp-tools` | MCP tool management |
| `/models` | Model management |
| `/service-accounts` | API keys |
| `/agent-workflows` | Temporal workflows |
| `/logs` | Application logs |
| `/metrics` | System metrics |
| `/traces` | Distributed traces |

## Tech Stack

- SvelteKit 2.x
- shadcn-svelte (preset: bcivVKYS)
- TanStack Query
- Axios
- TailwindCSS
- Ory Kratos + Oathkeeper (admin role required)

## Theme Colors

- Primary: Oxford Blue (#002147)
- Background: shadcn-svelte default + custom accent