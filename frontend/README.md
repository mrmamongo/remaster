# Frontend (Public App)

## Initialize shadcn-svelte

```bash
cd frontend
npx shadcn-svelte init --preset bcivVKYS
```

## Available Routes

| Route | Description |
|-------|-------------|
| `/` | Landing + Login |
| `/app` | Main chat interface |
| `/app/chats` | Chat history |
| `/app/kb` | Knowledge bases |
| `/app/settings` | User settings |

## Tech Stack

- SvelteKit 2.x
- shadcn-svelte (preset: bcivVKYS)
- TanStack Query
- Axios
- TailwindCSS
- Ory Kratos + Oathkeeper auth

## Theme Colors

- Primary: Oxford Blue (#002147)
- Background: shadcn-svelte default + custom accent