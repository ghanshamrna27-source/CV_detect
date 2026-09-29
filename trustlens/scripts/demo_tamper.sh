#!/usr/bin/env bash
# Issue genuine, model-swapped and forged receipts, then show the verifier output for each.
set -uo pipefail
cd "$(dirname "$0")/.."
PY="${PYTHON:-python}"
[ -x .venv/bin/python ] && PY=.venv/bin/python
[ -x .venv/Scripts/python.exe ] && PY=.venv/Scripts/python.exe
"$PY" -m trustlens demo-tamper
for r in genuine model_swapped forged; do
  echo; echo "=== trustlens verify artifacts/receipts/demo/$r.json"
  "$PY" -m trustlens verify "artifacts/receipts/demo/$r.json" --input artifacts/receipts/demo/input.png \
      --model artifacts/models/reference
done
exit 0
