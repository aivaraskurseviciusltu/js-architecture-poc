#!/usr/bin/env bash
# scripts/deploy-local.sh
# Applies the local kustomize overlay to the k3d cluster.
set -euo pipefail

CLUSTER_NAME="${1:-poc}"
NAMESPACE="poc"
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "==> Switching to cluster context k3d-${CLUSTER_NAME}"
kubectl config use-context "k3d-${CLUSTER_NAME}"

echo "==> Ensuring namespace exists"
kubectl create namespace "${NAMESPACE}" --dry-run=client -o yaml | kubectl apply -f -

echo "==> Generating self-signed TLS secret"
bash "${REPO_ROOT}/scripts/gen-tls-secret.sh" "${NAMESPACE}"

echo "==> Applying kustomize overlay: overlays/local"
kubectl apply -k "${REPO_ROOT}/k8s/overlays/local"

echo "==> Waiting for deployments to be available"
for deploy in order-service bff inventory-service notification-service frontend; do
  echo "    Waiting for ${deploy}..."
  kubectl rollout status deployment "${deploy}" \
    --namespace "${NAMESPACE}" \
    --timeout=300s
done

echo "==> Waiting for MongoDB StatefulSet"
kubectl rollout status statefulset mongodb \
  --namespace "${NAMESPACE}" \
  --timeout=120s

echo ""
echo "✅ Deployment complete!"
echo ""
echo "   App:      http://localhost:8080"
echo "   API:      http://localhost:8080/api/orders"
echo ""
echo "   Useful commands:"
echo "   kubectl get pods -n ${NAMESPACE}"
echo "   kubectl get hpa  -n ${NAMESPACE}"
echo "   kubectl top pods -n ${NAMESPACE}"
