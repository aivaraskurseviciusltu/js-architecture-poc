#!/usr/bin/env bash
# Generates a self-signed TLS cert for localhost and creates a k8s Secret.
# Called by scripts/deploy-local.sh — do NOT commit the generated .pem files.
set -euo pipefail

NAMESPACE="${1:-poc}"
SECRET_NAME="poc-tls"
CERT_DIR="$(mktemp -d)"

echo "==> Generating self-signed certificate for ${SECRET_NAME}"
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout "${CERT_DIR}/tls.key" \
  -out "${CERT_DIR}/tls.crt" \
  -subj "/CN=localhost/O=poc" \
  -addext "subjectAltName=DNS:localhost,IP:127.0.0.1" 2>/dev/null

SECRET_NAME="poc-tls-secret"

kubectl create secret tls "${SECRET_NAME}" \
  --namespace "${NAMESPACE}" \
  --cert="${CERT_DIR}/tls.crt" \
  --key="${CERT_DIR}/tls.key" \
  --dry-run=client -o yaml | kubectl apply -f -

rm -rf "${CERT_DIR}"
echo "   Secret '${SECRET_NAME}' applied in namespace '${NAMESPACE}'"
