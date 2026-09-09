# JS Fullstack Architecture PoC

An Nx monorepo demonstrating a fullstack architecture with event-driven microservices.

## Architecture

```
Browser → Frontend (React/Vite)
                ↓
           BFF (NestJS)
                ↓
        Order Service (NestJS/Mongo)
                ↓ SNS publish
         [order-events topic]
           /              \
  inventory-queue    notification-queue
        ↓                    ↓
 Inventory Service   Notification Service
  (NestJS/Mongo)       (NestJS/Mongo)
```

## Stack

| Layer | Tech |
|---|---|
| Frontend | React + Vite + TypeScript |
| BFF | NestJS + TypeScript |
| Order Service | NestJS + TypeScript + Mongoose |
| Inventory Service | NestJS + TypeScript + Mongoose |
| Notification Service | NestJS + TypeScript + Mongoose |
| Message Bus | AWS SNS → SQS (via LocalStack) |
| Database | MongoDB 7 (separate DB per service) |
| Monorepo | Nx 23 (integrated, npm) |

## Monorepo Structure

```
apps/
  frontend/                React + Vite SPA
  bff/                     NestJS aggregation gateway
  services/
    order-service/         Creates orders, publishes OrderCreated to SNS
    inventory-service/     Consumes inventory-queue, decrements stock
    notification-service/  Consumes notification-queue, records notifications
libs/
  shared-types/            Shared TS interfaces (Order, OrderCreatedEvent…)
  messaging/               EventPublisher (SNS) + SqsConsumer (polling, backoff, idempotency)
localstack/
  init/
    01-create-resources.sh  Auto-creates SNS/SQS resources on LocalStack start
```

## Quick Start (Docker)

```bash
# 1. Copy env file
cp .env.example .env

# 2. Build and start everything
docker compose up --build

# Endpoints:
#   Frontend:              http://localhost:4200
#   BFF:                   http://localhost:3000
#   Order Service:         http://localhost:3001
#   Inventory Service:     http://localhost:3002
#   Notification Service:  http://localhost:3003
#   LocalStack:            http://localhost:4566
#   MongoDB:               localhost:27017
```

## Local Development

```bash
npm install
# Start all services (requires local MongoDB + LocalStack)
nx run-many -t serve

# Build all
nx run-many -t build
```

## API Reference

### BFF (`http://localhost:3000`)
| Method | Path | Description |
|---|---|---|
| `POST` | `/api/orders` | Create order → triggers event pipeline |
| `GET` | `/api/orders/:id` | Get order by ID |
| `GET` | `/health` | Health check |
| `GET` | `/ready` | Readiness check |

### Order Service (`http://localhost:3001`)
| Method | Path | Description |
|---|---|---|
| `POST` | `/orders` | Create order + publish SNS event |
| `GET` | `/orders/:id` | Get order |
| `GET` | `/health` | Health |
| `GET` | `/ready` | Readiness (MongoDB ping) |

### Inventory Service (`http://localhost:3002`)
| Method | Path | Description |
|---|---|---|
| `GET` | `/inventory/:productId` | Get current stock level |
| `GET` | `/health` | Health |
| `GET` | `/ready` | Readiness (MongoDB ping) |

### Notification Service (`http://localhost:3003`)
| Method | Path | Description |
|---|---|---|
| `GET` | `/notifications` | List recorded notifications |
| `GET` | `/health` | Health |
| `GET` | `/ready` | Readiness (MongoDB ping) |

## Event Flow

1. `POST /api/orders` → BFF → Order Service persists to `orders` DB.
2. Order Service publishes `OrderCreated` event to SNS topic `order-events`.
3. SNS fans out to `inventory-queue` and `notification-queue`.
4. **Inventory Service** polls `inventory-queue`, decrements stock (`$inc`) atomically.
5. **Notification Service** polls `notification-queue`, records a notification document.
6. Both consumers use a `processed_events` collection with a unique index on `messageId` to prevent duplicate processing (idempotency).
7. Messages that fail after 3 attempts are routed to DLQs (`inventory-dlq`, `notification-dlq`) via SQS redrive policy.

## Database Strategy

One MongoDB instance; each service uses a **separate database name**:
- `orders` — Order Service
- `inventory` — Inventory Service
- `notifications` — Notification Service

## Environment Variables

See [`.env.example`](.env.example) for all variables. **Never commit `.env`.**

## Kubernetes (Local — k3d)

### Prerequisites

```bash
brew install k3d kubectl helm
```

### 1 — Create the cluster

```bash
bash scripts/create-cluster.sh
# Provisions k3d cluster 'poc' with 2 agents, NGINX ingress on :8080, and metrics-server
```

### 2 — Build images and load into cluster

```bash
bash scripts/build-and-load.sh
# Builds all 5 Docker images tagged :local and imports them via k3d image import
```

### 3 — Deploy

```bash
bash scripts/deploy-local.sh
# Generates self-signed TLS, applies k8s/overlays/local, waits for rollouts
```

**App is live at `http://localhost:8080`**

### Useful commands

```bash
# All pods
kubectl get pods -n poc

# Watch HPA
kubectl get hpa -n poc -w

# Resource usage (requires metrics-server)
kubectl top pods -n poc

# Tail a service log
kubectl logs -n poc -l app=order-service -f

# Restart a deployment (simulates pod failure)
kubectl rollout restart deployment/order-service -n poc
```

### Trigger HPA scale-up (load test)

```bash
# Install hey: brew install hey
hey -z 60s -c 50 http://localhost:8080/api/orders
# Watch HPA react:
kubectl get hpa -n poc -w
```

### Cluster lifecycle

```bash
# Stop cluster (keeps state)
k3d cluster stop poc

# Start again
k3d cluster start poc

# Delete completely
k3d cluster delete poc
```

### k8s Directory Structure

```
k8s/
├── base/
│   ├── namespace.yaml
│   ├── ingress.yaml
│   ├── network-policies.yaml
│   ├── mongodb/         (StatefulSet + headless Service + Secret)
│   ├── localstack/      (Deployment + Service + ConfigMap init script)
│   ├── order-service/   (Deployment + Service + ConfigMap + HPA)
│   ├── bff/             (Deployment + Service + ConfigMap + HPA)
│   ├── inventory-service/
│   ├── notification-service/
│   ├── frontend/
│   └── kustomization.yaml
└── overlays/
    ├── local/   ← used by deploy-local.sh (images :local, IfNotPresent)
    └── prod/    ← placeholder for ECR + external MongoDB Atlas + real TLS
```

### Production overlay notes

`k8s/overlays/prod/kustomization.yaml` is a documented placeholder. Before applying to prod:
1. Replace ECR image URIs.
2. Replace `mongodb-secret` with connection string to MongoDB Atlas or DocumentDB.
3. Remove LocalStack; point SNS/SQS ARNs to real AWS resources.
4. Install cert-manager and issue a real TLS certificate.


## Infrastructure as Code (Terraform)

Terraform lives under [`infra/terraform/`](infra/terraform/) and targets full AWS deployment.

### Prerequisites

```bash
brew install hashicorp/tap/terraform tflint
# tfsec binary installed separately — see scripts/create-cluster.sh
```

### Directory structure

```
infra/terraform/
├── providers.tf          # AWS provider + LocalStack overrides
├── backend.tf            # S3/DynamoDB backend (commented — enable for prod)
├── variables.tf          # All input variables
├── outputs.tf            # Key resource outputs
├── main.tf               # Module wiring
├── environments/
│   ├── local/terraform.tfvars   # LocalStack target
│   └── prod/terraform.tfvars    # AWS prod (no secrets committed)
└── modules/
    ├── network/      VPC, 3 public + 3 private subnets, IGW, NAT, Flow Logs
    ├── eks/          EKS cluster, managed node group, IRSA OIDC, KMS secrets encryption
    ├── mongodb/      Amazon DocumentDB, Secrets Manager, Security Group
    ├── elasticache/  Redis replication group, TLS, private subnet
    ├── messaging/    SNS topic, SQS queues + DLQs, KMS encryption, subscriptions
    ├── iam/          IRSA roles with least-privilege policies per service
    └── ecr/          ECR repos with scan-on-push + lifecycle policies
```

### Local-to-cloud mapping

| Local (docker-compose / k3d) | AWS (Terraform) |
|---|---|
| MongoDB container / StatefulSet | Amazon DocumentDB (`modules/mongodb`) |
| LocalStack SNS topic `order-events` | AWS SNS topic (`modules/messaging`) |
| LocalStack SQS `inventory-queue` | AWS SQS queue (`modules/messaging`) |
| LocalStack SQS `notification-queue` | AWS SQS queue (`modules/messaging`) |
| Docker credentials in `.env` | AWS Secrets Manager via IRSA (`modules/iam`) |
| k3d cluster | Amazon EKS (`modules/eks`) |
| `docker build` + `k3d image import` | ECR push + EKS node pull (`modules/ecr`) |
| NGINX ingress on localhost:8080 | AWS Load Balancer Controller + ACM TLS |

### Commands

```bash
cd infra/terraform

# Initialise
terraform init

# Validate (no credentials needed)
terraform validate
terraform fmt -recursive -check

# Lint
tflint --recursive

# Security scan
tfsec .

# Plan against LocalStack (start LocalStack first: docker compose up localstack)
terraform plan -var-file=environments/local/terraform.tfvars \
  -target=module.messaging -target=module.ecr

# Plan against prod (requires AWS credentials + TF_VAR_docdb_master_password)
export TF_VAR_docdb_master_password="<secret>"
terraform plan -var-file=environments/prod/terraform.tfvars
```

### MongoDB decision

See [`infra/docs/ADR-001-mongodb-choice.md`](infra/docs/ADR-001-mongodb-choice.md) for the DocumentDB vs Atlas decision record.

