#!/usr/bin/env bash
# One command: raw CIFAR-10 -> contributors -> models -> scan -> audit -> risk -> trace -> tamper suite -> eval.
# Usage: scripts/run_all.sh [--profile quick] [extra run-all flags]
set -euo pipefail
cd "$(dirname "$0")/.."
PY="${PYTHON:-python}"
[ -x .venv/bin/python ] && PY=.venv/bin/python
[ -x .venv/Scripts/python.exe ] && PY=.venv/Scripts/python.exe
PROFILE_ARGS=()
if [ "${1:-}" = "--profile" ]; then PROFILE_ARGS=(--profile "$2"); shift 2; fi
"$PY" -m trustlens "${PROFILE_ARGS[@]}" run-all "$@"
