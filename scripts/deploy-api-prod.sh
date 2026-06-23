#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"

node "$ROOT/scripts/sync-fly-secrets.mjs"
cd "$ROOT/apps/api"
flyctl deploy --app "${FLY_APP:-relay-tether-labs}"
