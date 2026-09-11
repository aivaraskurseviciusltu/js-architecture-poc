#!/usr/bin/env bash
# scripts/run-loadtest.sh
# Wrapper to run k6 load tests against the ingress or local stack.
#
# Usage:
#   ./scripts/run-loadtest.sh smoke       # quick sanity check
#   ./scripts/run-loadtest.sh load        # sustained ramp (triggers HPA)
#   ./scripts/run-loadtest.sh spike       # burst (triggers KEDA)
#   ./scripts/run-loadtest.sh soak        # long stability test
#   ./scripts/run-loadtest.sh all         # run all four in sequence
#
# Environment overrides:
#   BASE_URL=https://poc.example.com ./scripts/run-loadtest.sh smoke
#   JWT_TOKEN=$(./scripts/get-token.sh) ./scripts/run-loadtest.sh load

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOADTEST_DIR="${SCRIPT_DIR}/../loadtest"
RESULTS_DIR="${SCRIPT_DIR}/../docs/loadtest-results"

BASE_URL="${BASE_URL:-http://localhost:3000}"
JWT_TOKEN="${JWT_TOKEN:-}"

mkdir -p "$RESULTS_DIR"

run_test() {
  local name="$1"
  local script="${LOADTEST_DIR}/${name}.js"
  local output="${RESULTS_DIR}/${name}-$(date +%Y%m%dT%H%M%S).txt"

  if [[ ! -f "$script" ]]; then
    echo "ERROR: script not found: $script" >&2
    exit 1
  fi

  echo ""
  echo "════════════════════════════════════════════"
  echo " Running: ${name}.js  →  BASE_URL=${BASE_URL}"
  echo "════════════════════════════════════════════"

  k6 run \
    --env BASE_URL="${BASE_URL}" \
    --env JWT_TOKEN="${JWT_TOKEN}" \
    --summary-export="${RESULTS_DIR}/${name}-summary-$(date +%Y%m%dT%H%M%S).json" \
    "$script" \
    2>&1 | tee "$output"

  echo ""
  echo "Results saved to: $output"
}

case "${1:-}" in
  smoke|load|spike|soak)
    run_test "$1"
    ;;
  all)
    for t in smoke load spike soak; do
      run_test "$t"
    done
    ;;
  *)
    echo "Usage: $0 <smoke|load|spike|soak|all>" >&2
    exit 1
    ;;
esac
