#!/usr/bin/env bash
# scripts/create-cluster.sh
# Provisions a local k3d cluster with NGINX ingress controller and metrics-server.
set -euo pipefail

CLUSTER_NAME="${1:-poc}"
HTTP_PORT="${2:-8080}"

echo "==> Creating k3d cluster: ${CLUSTER_NAME}"
k3d cluster create "${CLUSTER_NAME}" \
  --agents 2 \
  --port "${HTTP_PORT}:80@loadbalancer" \
  --port "8443:443@loadbalancer" \
  --k3s-arg "--disable=traefik@server:0" \
  --wait

echo "==> Switching kubectl context to k3d-${CLUSTER_NAME}"
kubectl config use-context "k3d-${CLUSTER_NAME}"

echo "==> Installing NGINX Ingress Controller"
kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/controller-v1.12.1/deploy/static/provider/cloud/deploy.yaml

echo "==> Waiting for NGINX ingress controller to be ready"
kubectl wait --namespace ingress-nginx \
  --for=condition=ready pod \
  --selector=app.kubernetes.io/name=ingress-nginx,app.kubernetes.io/component=controller \
  --timeout=180s

echo "==> Installing Metrics Server"
kubectl apply -f https://github.com/kubernetes-sigs/metrics-server/releases/latest/download/components.yaml

# Patch metrics-server to allow insecure TLS (required for k3d)
kubectl patch deployment metrics-server \
  --namespace kube-system \
  --type=json \
  -p='[{"op":"add","path":"/spec/template/spec/containers/0/args/-","value":"--kubelet-insecure-tls"}]'

echo "==> Waiting for Metrics Server to be ready"
kubectl wait --namespace kube-system \
  --for=condition=ready pod \
  --selector=k8s-app=metrics-server \
  --timeout=120s

echo ""
echo "✅ Cluster '${CLUSTER_NAME}' is ready."
echo "   kubectl config current-context: $(kubectl config current-context)"
echo "   Ingress available at: http://localhost:${HTTP_PORT}"
