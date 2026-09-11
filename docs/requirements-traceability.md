# Requirements Traceability Matrix

Maps each badge requirement to concrete evidence artifacts in this repository.

---

## Requirement 1 — Secure Cloud Orchestration Infrastructure

> Design and implement a secure, scalable cloud-based orchestration infrastructure.

| Evidence | Location |
|----------|----------|
| Terraform EKS, VPC, DocumentDB, ECR, Elasticache, IAM (IRSA), SNS/SQS | [`infra/terraform/`](../infra/terraform/) |
| Kubernetes RBAC (ServiceAccounts, Roles, RoleBindings per service) | [`k8s/base/rbac/`](../k8s/base/rbac/) |
| Pod Security Standards `restricted` on namespace | [`k8s/base/namespace.yaml`](../k8s/base/namespace.yaml) |
| `securityContext` on all Deployments (non-root, readOnly FS, drop ALL caps) | [`k8s/base/*/deployment.yaml`](../k8s/base/) |
| Network Policies (default-deny + explicit allow) | [`k8s/base/network-policies.yaml`](../k8s/base/network-policies.yaml) |
| TLS at ingress + cert-manager ClusterIssuer | [`k8s/base/ingress.yaml`](../k8s/base/ingress.yaml), [`k8s/base/cert-manager/`](../k8s/base/cert-manager/) |
| SealedSecrets (no plaintext in Git) + ESO for prod | [`k8s/base/sealed-secrets/`](../k8s/base/sealed-secrets/) |
| Threat model T1–T6, secrets strategy, RBAC explanation | [`docs/security.md`](security.md) |
| CI: `npm audit`, Trivy image scan, gitleaks, tfsec, tflint | [`.github/workflows/ci.yml`](../.github/workflows/ci.yml) |
| CD: OIDC-based push to GHCR, ArgoCD manifests | [`.github/workflows/cd.yml`](../.github/workflows/cd.yml), [`k8s/argocd/`](../k8s/argocd/) |
| SBOM (SPDX-JSON) as CI artifact | [`.github/workflows/ci.yml`](../.github/workflows/ci.yml) — `sbom` artifact |

---

## Requirement 2 — End-to-End Scalable Web System

> Build an end-to-end scalable web system demonstrating modern full-stack architecture.

| Evidence | Location |
|----------|----------|
| React + Vite frontend (SPA with login, order list, create form) | [`apps/frontend/`](../apps/frontend/) |
| NestJS BFF (JWT auth, rate limiting, Helmet, ValidationPipe) | [`apps/bff/`](../apps/bff/) |
| NestJS order-service (MongoDB, event publishing, NoSQL sanitize) | [`apps/services/order-service/`](../apps/services/order-service/) |
| Event-driven consumers (inventory + notification via SQS) | [`apps/services/inventory-service/`](../apps/services/inventory-service/), [`apps/services/notification-service/`](../apps/services/notification-service/) |
| HPA for BFF + order-service (CPU-based, 1→5 replicas) | [`k8s/base/bff/hpa.yaml`](../k8s/base/bff/hpa.yaml), [`k8s/base/order-service/hpa.yaml`](../k8s/base/order-service/hpa.yaml) |
| KEDA ScaledObjects for consumers (SQS depth, 1→10 replicas) | [`k8s/base/keda/scaled-objects.yaml`](../k8s/base/keda/scaled-objects.yaml) |
| RED metrics on all services (`/metrics`, ServiceMonitors) | [`libs/shared-types/src/lib/metrics.ts`](../libs/shared-types/src/lib/metrics.ts), [`k8s/base/monitoring/`](../k8s/base/monitoring/) |
| Grafana dashboards (RED + HPA + KEDA + memory) | [`k8s/observability/grafana-dashboard-configmap.yaml`](../k8s/observability/grafana-dashboard-configmap.yaml) |
| k6 load test results (smoke, load, spike, soak) | [`docs/loadtest-results/`](loadtest-results/) |
| Scaling strategy document | [`docs/scaling.md`](scaling.md) |
| Architecture C4 diagrams + data/event flow | [`docs/architecture.md`](architecture.md) |

---

## Requirement 3 — Fault-Tolerant and Reactive Front-End and Back-End

> Implement fault-tolerant, reactive systems that handle failures gracefully.

| Evidence | Location |
|----------|----------|
| Kubernetes liveness/readiness probes on all services | All `k8s/base/*/deployment.yaml` |
| SQS message retry (3 attempts) + Dead Letter Queue | [`infra/terraform/modules/messaging/main.tf`](../infra/terraform/modules/messaging/main.tf) |
| AllExceptionsFilter (no stack trace leakage, structured error response) | BFF: [`apps/bff/src/app/filters/`](../apps/bff/src/app/filters/), order-service: [`apps/services/order-service/src/app/filters/`](../apps/services/order-service/src/app/filters/) |
| Multiple replicas (HPA min=1) — no single point of failure for stateless services | [`k8s/base/bff/hpa.yaml`](../k8s/base/bff/hpa.yaml) |
| MongoDB replica set (Atlas 3-node or DocumentDB multi-AZ) | [`docs/architecture.md`](architecture.md) — Local-to-cloud mapping |
| KEDA scale-to-minimum keeps at least 1 consumer replica warm | [`k8s/base/keda/scaled-objects.yaml`](../k8s/base/keda/scaled-objects.yaml) |
| OpenTelemetry tracing (end-to-end span visibility across BFF → order-service → MongoDB) | [`apps/bff/src/tracing.js`](../apps/bff/src/tracing.js), [`k8s/base/tracing/otel-jaeger.yaml`](../k8s/base/tracing/otel-jaeger.yaml) |
| Soak test shows no memory leak / error rate degradation over 30 min | [`docs/loadtest-results/soak-result.txt`](loadtest-results/soak-result.txt) |
| Spike test shows system recovers after 200-VU burst (KEDA drains queue) | [`docs/loadtest-results/spike-result.txt`](loadtest-results/spike-result.txt) |

---

## Requirement 4 — Analyse and Suggest Best-Fit Technology Stacks

> Critically evaluate technology choices and document decisions with alternatives considered.

| Evidence | Location |
|----------|----------|
| ADR-0001: Nx vs. pnpm+Turborepo vs. Lerna | [`docs/adr/ADR-0001-nx-monorepo.md`](adr/ADR-0001-nx-monorepo.md) |
| ADR-0002: NestJS vs. Express+tRPC vs. Fastify | [`docs/adr/ADR-0002-nestjs.md`](adr/ADR-0002-nestjs.md) |
| ADR-0003: SNS+SQS vs. Kafka vs. RabbitMQ | [`docs/adr/ADR-0003-sns-sqs.md`](adr/ADR-0003-sns-sqs.md) |
| ADR-0004: Kustomize vs. Helm vs. Raw manifests | [`docs/adr/ADR-0004-kubernetes-kustomize.md`](adr/ADR-0004-kubernetes-kustomize.md) |
| ADR-0005: LocalStack vs. AWS Sandbox vs. ElasticMQ | [`docs/adr/ADR-0005-localstack.md`](adr/ADR-0005-localstack.md) |
| ADR-0006: KEDA vs. Custom metrics adapter vs. Static replicas | [`docs/adr/ADR-0006-keda.md`](adr/ADR-0006-keda.md) |
| ADR-0007: MongoDB Atlas vs. DocumentDB vs. PostgreSQL vs. DynamoDB | [`docs/adr/ADR-0007-mongodb.md`](adr/ADR-0007-mongodb.md) |
