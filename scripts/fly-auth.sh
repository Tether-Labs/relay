#!/usr/bin/env bash
# Load Fly API token from the environment or local flyctl config (~/.fly/config.yml).
if [[ -n "${FLY_API_TOKEN:-}" ]]; then
  return 0 2>/dev/null || exit 0
fi

if [[ -f "${HOME}/.fly/config.yml" ]]; then
  export FLY_API_TOKEN="$(
    python3 - <<'PY'
import re
from pathlib import Path

text = Path.home().joinpath(".fly", "config.yml").read_text()
match = re.search(r"^access_token:\s*(.+)$", text, re.M)
print(match.group(1).strip() if match else "", end="")
PY
  )"
fi

if [[ -z "${FLY_API_TOKEN:-}" ]]; then
  echo "Fly not authenticated." >&2
  echo "Run: flyctl auth login" >&2
  echo "Or set FLY_API_TOKEN (GitHub Actions: add repo secret FLY_API_TOKEN)." >&2
  exit 1
fi
