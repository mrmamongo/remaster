#!/bin/bash

# Initialize shadcn-svelte with custom preset for both projects

set -e

echo "=== Initializing Frontend ==="
cd "$(dirname "$0")/frontend"
npx shadcn-svelte init --preset bcivVKYS --yes

echo ""
echo "=== Initializing Admin ==="
cd "$(dirname "$0")/admin"
npx shadcn-svelte init --preset bcivVKYS --yes

echo ""
echo "=== Done! ==="
echo "Frontend: http://localhost:3000"
echo "Admin: http://localhost:3001"