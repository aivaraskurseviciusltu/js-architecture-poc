#!/usr/bin/env bash
# scripts/build-and-load.sh
# Builds Docker images for all apps and imports them into the k3d cluster.
set -euo pipefail

CLUSTER_NAME="${1:-poc}"
TAG="local"
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "==> Building images (tag: ${TAG})"

docker build -t "order-service:${TAG}" \
  -f "${REPO_ROOT}/apps/services/order-service/Dockerfile" \
  "${REPO_ROOT}"

docker build -t "inventory-service:${TAG}" \
  -f "${REPO_ROOT}/apps/services/inventory-service/Dockerfile" \
  "${REPO_ROOT}"

docker build -t "notification-service:${TAG}" \
  -f "${REPO_ROOT}/apps/services/notification-service/Dockerfile" \
  "${REPO_ROOT}"

docker build -t "bff:${TAG}" \
  -f "${REPO_ROOT}/apps/bff/Dockerfile" \
  "${REPO_ROOT}"

docker build -t "frontend:${TAG}" \
  -f "${REPO_ROOT}/apps/frontend/Dockerfile" \
  --build-arg VITE_BFF_URL="${VITE_BFF_URL:-http://localhost:8080}" \
  "${REPO_ROOT}"

echo "==> Importing images into k3d cluster '${CLUSTER_NAME}'"
k3d image import \
  "order-service:${TAG}" \
  "inventory-service:${TAG}" \
  "notification-service:${TAG}" \
  "bff:${TAG}" \
  "frontend:${TAG}" \
  -c "${CLUSTER_NAME}"

echo "✅ All images built and loaded into cluster '${CLUSTER_NAME}'"
