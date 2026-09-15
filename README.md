# JS Fullstack Architecture PoC

> A production grade fullstack PoC demonstrating secure cloud orchestration,
> event-driven scalability and fault tolerance.

---

## Architecture Diagram

![AWS Production Architecture](docs/aws-production-architecture.drawio.png)

---

## Stack

| Layer | Tech |
|-------|------|
| Frontend | React 18 + Vite + TypeScript + MUI |
| BFF | NestJS + TypeScript (JWT auth, Helmet, rate limiting) |
| Order Service | NestJS + TypeScript + Mongoose (NoSQL sanitize, ValidationPipe) |
| Inventory/Notification | NestJS + TypeScript (SQS consumers, KEDA autoscaling) |
| Message Bus | AWS SNS → SQS (LocalStack locally, real SQS in prod) |
| Database | MongoDB 7 (k3d StatefulSet / Atlas / DocumentDB in prod) |
| Metrics | `prom-client` on all services → Prometheus + Grafana |
| Tracing | OpenTelemetry SDK → OTel Collector → Jaeger |
| Monorepo | Nx 23 (integrated, npm, `nx affected` CI) |
| Container Orchestration | Kubernetes (k3d local, EKS prod via Terraform) |
| CI/CD | GitHub Actions (lint → test → build → scan → push) |
| IaC | Terraform (EKS, VPC, DocumentDB, ECR, SNS/SQS, Elasticache, IAM IRSA) |

---

## Quick Start (Docker Compose)

```bash
# 1. Copy env file
cp .env.example .env

# 2. Build and start everything (one command)
docker compose up --build

# Endpoints:
#   Frontend:              http://localhost:4200
#   BFF API:               http://localhost:3000
#   Order Service:         http://localhost:3001
#   Inventory Service:     http://localhost:3002
#   Notification Service:  http://localhost:3003
#   LocalStack:            http://localhost:4566

# 3. Log in (dev accounts: alice/alice123  or  bob/bob123)
curl -X POST http://localhost:3000/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"username":"alice","password":"alice123"}'
# → {"access_token":"eyJ..."}

# 4. Create an order
curl -X POST http://localhost:3000/api/orders \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer <token>' \
  -d '{"customerId":"alice","items":[{"sku":"WIDGET-001","quantity":2,"unitPrice":9.99}]}'
```

---

## Local Development (hot-reload)

```bash
npm install
nx run-many -t serve    # starts all four NestJS apps + Vite dev server
```

Requires local MongoDB (`mongod`) and LocalStack (`docker compose up localstack`).

---

## Kubernetes Deploy (k3d)

```bash
# 1. Create cluster
bash scripts/create-cluster.sh

# 2. Build + load images
bash scripts/build-and-load.sh

# 3. Deploy
bash scripts/deploy-local.sh
# → App live at http://localhost:8080
```

```bash
# Useful kubectl commands
kubectl get pods -n poc
kubectl get hpa -n poc -w           # watch HPA scale BFF/order-service
kubectl get scaledobject -n poc -w  # watch KEDA scale consumers
kubectl top pods -n poc
kubectl logs -n poc -l app=order-service -f
```

---

## Observability Stack

```bash
# Install Prometheus + Grafana
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm upgrade --install kube-prometheus-stack prometheus-community/kube-prometheus-stack \
  -f k8s/observability/kube-prometheus-stack-values.yaml \
  --namespace monitoring --create-namespace

# Apply Grafana dashboard ConfigMap
kubectl apply -f k8s/observability/grafana-dashboard-configmap.yaml

# Open Grafana
kubectl port-forward -n monitoring svc/kube-prometheus-stack-grafana 3001:80
# http://localhost:3001  (admin / admin)
# Dashboard: "PoC Services — RED Metrics & Scaling"

# Port-forward Jaeger trace UI
kubectl port-forward -n poc svc/jaeger 16686:16686
# http://localhost:16686
```

Metrics exposed: `GET /metrics` on all four services (prom-client, RED metrics + default Node.js process metrics).

---

## Load Testing

```bash
# Prerequisites
brew install k6

# Get a JWT first
export JWT_TOKEN=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"username":"alice","password":"alice123"}' | jq -r .access_token)

# Run individual scenarios
./scripts/run-loadtest.sh smoke   # 1 VU, 30s — sanity check
./scripts/run-loadtest.sh load    # ramp to 100 VUs — triggers HPA
./scripts/run-loadtest.sh spike   # 200 VUs burst — triggers KEDA
./scripts/run-loadtest.sh soak    # 30 VUs for 30 min — stability

# Run all
./scripts/run-loadtest.sh all
```

Results are saved to [`docs/loadtest-results/`](docs/loadtest-results/). See [`docs/scaling.md`](docs/scaling.md) for analysis.

---

## CI/CD

| Job | Trigger | What it does |
|-----|---------|--------------|
| `lint` | Every push/PR | `nx affected -t lint` |
| `test` | Every push/PR | `nx affected -t test` (Jest) |
| `build` | After lint+test | `nx affected -t build` + Docker image builds |
| `scan` | After build | `npm audit`, Trivy (HIGH/CRITICAL), gitleaks, tfsec, tflint; SBOM artifact |
| `push` | main branch only | Push all images to GHCR |
| `cd` | On tag `v*` | Kustomize prod overlay → ArgoCD sync |

All GitHub Actions are pinned by SHA. See [`.github/workflows/`](.github/workflows/).

---

## Infrastructure as Code

```bash
cd infra/terraform
terraform init
terraform validate
tflint --recursive      # 0 warnings
tfsec .                 # 0 findings  (macOS: /opt/homebrew/bin/tfsec .)

# Plan (LocalStack)
terraform plan -var-file=environments/local/terraform.tfvars

# Plan (prod — needs AWS credentials)
export TF_VAR_docdb_master_password="<secret>"
terraform plan -var-file=environments/prod/terraform.tfvars
```

Modules: `network` · `eks` · `mongodb` (DocumentDB) · `elasticache` · `messaging` (SNS+SQS+DLQ+KMS) · `iam` (IRSA) · `ecr`

---

## Security

| Control | Implementation |
|---------|---------------|
| Auth | JWT (passport-jwt) on all `/api/orders` routes |
| Rate limiting | 100 req/min per IP (`@nestjs/throttler`) |
| Security headers | Helmet middleware |
| Input validation | `class-validator` + `ValidationPipe` |
| NoSQL injection | `MongoSanitizeMiddleware` — strips `$`/`.` keys |
| Secrets | SealedSecrets (k8s local) · ESO + AWS Secrets Manager (prod) |
| TLS | cert-manager self-signed CA (local) · ACM / Let's Encrypt (prod) |
| Container hardening | Non-root, `readOnlyRootFilesystem`, drop ALL caps, `seccompProfile: RuntimeDefault` |
| RBAC | Per-service ServiceAccounts, least-privilege Roles |
| Network | Default-deny NetworkPolicy + explicit allow rules |
| CI scans | `npm audit`, Trivy, gitleaks, tfsec, tflint, SBOM (SPDX-JSON) |

See [`docs/security.md`](docs/security.md) for the full threat model (T1–T6).

---

## Documentation

| Document | Description |
|----------|-------------|
| [`docs/architecture.md`](docs/architecture.md) | C4 diagrams (Context, Container, Component), data flow, event flow, local-to-cloud mapping |
| [`docs/scaling.md`](docs/scaling.md) | HPA, KEDA, MongoDB read scaling, caching strategy, load test results |
| [`docs/security.md`](docs/security.md) | Threat model, secrets management, container hardening, RBAC |
| [`docs/loadtest-results/`](docs/loadtest-results/) | k6 output for smoke, load, spike, soak scenarios |
| [`docs/evidence/`](docs/evidence/) | Grafana screenshots (HPA scale-up, KEDA spike, queue drain, memory soak) |

---

## API Reference

### BFF (`http://localhost:3000`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/api/auth/login` | ❌ | Login → JWT |
| `POST` | `/api/orders` | ✅ JWT | Create order |
| `GET` | `/api/orders/:id` | ✅ JWT | Get order by ID |
| `GET` | `/health` | ❌ | Health check |
| `GET` | `/ready` | ❌ | Readiness |
| `GET` | `/metrics` | ❌ | Prometheus metrics |

### Order Service (`http://localhost:3001`)
| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/orders` | Create order + publish event |
| `GET` | `/orders/:id` | Get order |
| `GET` | `/health` | Health |
| `GET` | `/metrics` | Prometheus metrics |

---

## Environment Variables

See [`.env.example`](.env.example) for all variables. **Never commit `.env`.**

Key variables:

| Variable | Default | Description |
|----------|---------|-------------|
| `MONGODB_URI` | `mongodb://localhost:27017` | MongoDB connection string |
| `JWT_SECRET` | — | JWT signing secret (≥32 bytes in prod) |
| `CORS_ORIGIN` | `*` | Allowed CORS origin (set to frontend URL in prod) |
| `ORDER_SERVICE_URL` | `http://localhost:3001` | BFF → order-service URL |
| `AWS_ENDPOINT_URL` | `http://localhost:4566` | LocalStack endpoint |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | `http://localhost:4318` | OTel collector endpoint |
| `DEV_USERS` | `alice:alice123,bob:bob123` | Dev login accounts (BFF only) |
