#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ENV_FILE="$ROOT/apps/web/.env.production"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing $ENV_FILE"
  echo "Copy apps/web/.env.production.example → apps/web/.env.production and add pk_live_... keys."
  exit 1
fi

set -a
# shellcheck disable=SC1090
source "$ENV_FILE"
set +a

: "${VITE_API_URL:?Set VITE_API_URL in apps/web/.env.production}"
: "${VITE_CLERK_PUBLISHABLE_KEY:?Set VITE_CLERK_PUBLISHABLE_KEY in apps/web/.env.production}"

if [[ "$VITE_CLERK_PUBLISHABLE_KEY" == pk_test_* ]]; then
  echo "Refusing to deploy: VITE_CLERK_PUBLISHABLE_KEY is pk_test_... (use pk_live_... in .env.production)"
  exit 1
fi

cd "$ROOT/apps/web"
vercel deploy --prod --yes \
  --build-env "VITE_API_URL=$VITE_API_URL" \
  --build-env "VITE_CLERK_PUBLISHABLE_KEY=$VITE_CLERK_PUBLISHABLE_KEY"
