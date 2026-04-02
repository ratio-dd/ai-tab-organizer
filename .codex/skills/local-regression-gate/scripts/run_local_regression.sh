#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="${1:-$(pwd)}"
REPO_ROOT="$(cd "$REPO_ROOT" && pwd)"

echo "[regression] repo=$REPO_ROOT"

cd "$REPO_ROOT"

echo "[check] node syntax"
node --check background.js
node --check popup/popup.js

echo "[check] manifest json"
jq empty manifest.json

echo "[check] provider residue scan"
if rg -n "https://api\\.moonshot\\.cn|https://api\\.openai\\.com" background.js popup/popup.js manifest.json >/tmp/regression_provider_scan.txt; then
  echo "REGRESSION_RESULT=FAIL"
  echo "[fail] found legacy provider runtime endpoint:"
  cat /tmp/regression_provider_scan.txt
  exit 1
fi

echo "[check] smoke analyze/apply/undo + fallback"
node .codex/skills/local-regression-gate/scripts/smoke_background.js "$REPO_ROOT"

echo "[check] manifest version"
VERSION="$(jq -r '.version' manifest.json)"
echo "manifest_version=$VERSION"

echo "REGRESSION_RESULT=PASS"
