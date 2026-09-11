# Architecture Documentation

## Overview

This document describes the architecture of the `js-architecture-poc` — a fullstack,
event-driven, cloud-native application demonstrating production-grade patterns across
all layers of a modern web system.

---

## C4 Model Diagrams

### Level 1 — System Context

```mermaid
C4Context
  title System Context — js-architecture-poc

  Person(user, "End User", "Creates and views orders via a web browser")
  Person(ops, "Platform Engineer", "Deploys, monitors, and operates the system")

  System(poc, "js-architecture-poc", "Order management platform demonstrating event-driven, cloud-native architecture")

  System_Ext(mongodb_atlas, "MongoDB Atlas / AWS DocumentDB", "Persistent order, inventory, and notification data")
  System_Ext(aws_sns_sqs, "AWS SNS + SQS (LocalStack locally)", "Async event bus between services")
  System_Ext(ghcr, "GitHub Container Registry", "Container image storage")
  System_Ext(aws_secrets, "AWS Secrets Manager", "Runtime secret storage (prod)")

  Rel(user, poc, "Uses", "HTTPS")
  Rel(ops, poc, "Deploys / monitors", "kubectl / ArgoCD / Grafana")
  Rel(poc, mongodb_atlas, "Reads/writes", "TLS MongoDB wire protocol")
  Rel(poc, aws_sns_sqs, "Publishes/consumes events", "HTTPS (AWS SDK)")
  Rel(poc, aws_secrets, "Fetches secrets at startup", "HTTPS (ESO)")
```

---

### Level 2 — Container Diagram

```mermaid
C4Container
  title Container Diagram — js-architecture-poc

  Person(user, "End User")

  Container(frontend, "Frontend", "React + Vite, served by nginx-unprivileged", "SPA — order list + create form + login")
  Container(bff, "BFF", "NestJS on Node 24", "API gateway: auth (JWT), rate limiting, Helmet, proxies to order-service")
  Container(order_svc, "Order Service", "NestJS on Node 24", "Creates orders in MongoDB; publishes OrderCreated event to SNS")
  Container(inventory_svc, "Inventory Service", "NestJS on Node 24", "Consumes SQS queue; reserves inventory in MongoDB")
  Container(notification_svc, "Notification Service", "NestJS on Node 24", "Consumes SQS queue; records notifications in MongoDB")
  ContainerDb(mongodb, "MongoDB 7", "Replica set (k3d local) / Atlas (prod)", "Orders, inventory, notifications")
  Container(localstack, "LocalStack", "AWS emulator", "SNS topic + 2 SQS queues (local dev/CI)")
  Container(otel, "OTel Collector + Jaeger", "opentelemetry-collector-contrib + Jaeger all-in-one", "Distributed trace collection and UI")
  Container(prometheus, "Prometheus + Grafana", "kube-prometheus-stack", "Metrics scraping, dashboards, alerting")

  Rel(user, frontend, "Accesses", "HTTPS :443 → nginx :8080")
  Rel(frontend, bff, "API calls", "HTTPS /api/*")
  Rel(bff, order_svc, "Proxies order requests", "HTTP (cluster-internal)")
  Rel(order_svc, mongodb, "Persists orders", "MongoDB TLS")
  Rel(order_svc, localstack, "Publishes OrderCreated", "SNS publish")
  Rel(localstack, inventory_svc, "Delivers event", "SQS poll")
  Rel(localstack, notification_svc, "Delivers event", "SQS poll")
  Rel(inventory_svc, mongodb, "Updates inventory", "MongoDB TLS")
  Rel(notification_svc, mongodb, "Records notification", "MongoDB TLS")
  Rel(bff, otel, "Exports traces", "OTLP HTTP :4318")
  Rel(order_svc, otel, "Exports traces", "OTLP HTTP :4318")
  Rel(prometheus, bff, "Scrapes /metrics", "HTTP")
  Rel(prometheus, order_svc, "Scrapes /metrics", "HTTP")
  Rel(prometheus, inventory_svc, "Scrapes /metrics", "HTTP")
  Rel(prometheus, notification_svc, "Scrapes /metrics", "HTTP")
```

---

### Level 3 — Component Diagram (BFF)

```mermaid
C4Component
  title Component Diagram — BFF (NestJS)

  Container_Ext(frontend, "Frontend", "React SPA")
  Container_Ext(order_svc, "Order Service", "NestJS")

  Container_Boundary(bff, "BFF") {
    Component(helmet, "Helmet Middleware", "NestJS middleware", "Adds security headers (CSP, HSTS, X-Frame-Options)")
    Component(throttler, "ThrottlerGuard", "@nestjs/throttler", "100 req/min per IP globally")
    Component(metrics_mw, "MetricsMiddleware", "prom-client", "Records RED metrics per route")
    Component(auth_ctrl, "AuthController", "NestJS Controller", "POST /api/auth/login — issues JWT")
    Component(jwt_guard, "JwtAuthGuard", "passport-jwt", "Validates Bearer JWT on /api/orders/*")
    Component(orders_ctrl, "OrdersController", "NestJS Controller", "Proxies GET/POST /api/orders to order-service")
    Component(health_ctrl, "HealthController", "NestJS Controller", "GET /health, GET /ready")
    Component(metrics_ctrl, "MetricsController", "prom-client", "GET /metrics — Prometheus scrape endpoint")
    Component(exceptions, "AllExceptionsFilter", "NestJS Filter", "Sanitises error responses (no stack traces)")
    Component(http_client, "HttpService", "@nestjs/axios", "Downstream calls to order-service")
  }

  Rel(frontend, helmet, "All requests pass through")
  Rel(helmet, throttler, "→")
  Rel(throttler, metrics_mw, "→")
  Rel(metrics_mw, auth_ctrl, "POST /api/auth/login")
  Rel(metrics_mw, jwt_guard, "Protected routes")
  Rel(jwt_guard, orders_ctrl, "Authorised requests")
  Rel(orders_ctrl, http_client, "Proxy call")
  Rel(http_client, order_svc, "HTTP")
```

---

## Data Flow Diagram

```mermaid
sequenceDiagram
  participant U as User (Browser)
  participant FE as Frontend (nginx)
  participant BFF as BFF (NestJS)
  participant OS as Order Service
  participant DB as MongoDB
  participant SNS as SNS (LocalStack)
  participant INV as Inventory Service
  participant NOT as Notification Service

  U->>FE: POST /api/orders (form submit)
  FE->>BFF: POST /api/orders (Bearer JWT)
  BFF->>BFF: JwtAuthGuard validates token
  BFF->>OS: POST /orders (HTTP proxy)
  OS->>OS: MongoSanitizeMiddleware strips $ keys
  OS->>OS: ValidationPipe validates DTO
  OS->>DB: insertOne(order)
  DB-->>OS: { _id, ... }
  OS->>SNS: publish(OrderCreatedEvent)
  OS-->>BFF: 201 { _id, status: PENDING }
  BFF-->>FE: 201 { _id, status: PENDING }
  FE-->>U: Order created — refreshes list

  par Event consumers (async)
    SNS->>INV: SQS message (inventory queue)
    INV->>DB: updateOne(inventory, reserve items)
    and
    SNS->>NOT: SQS message (notification queue)
    NOT->>DB: insertOne(notification)
  end
```

---

## Event Flow Diagram

```mermaid
flowchart LR
  OS[Order Service] -->|OrderCreated| SNS[SNS Topic\norders-created]
  SNS -->|fan-out| INV_Q[SQS\norders-inventory-queue]
  SNS -->|fan-out| NOT_Q[SQS\norders-notification-queue]
  INV_Q -->|poll| IS[Inventory Service\n1–10 replicas\nKEDA]
  NOT_Q -->|poll| NS[Notification Service\n1–10 replicas\nKEDA]
  IS --> DB[(MongoDB\ninventory db)]
  NS --> DB2[(MongoDB\nnotifications db)]

  subgraph DLQ
    INV_Q -->|after 3 retries| INV_DLQ[inventory-dlq]
    NOT_Q -->|after 3 retries| NOT_DLQ[notification-dlq]
  end
```

---

## Local-to-Cloud Mapping

| Local (docker compose / k3d) | Production (AWS) | Notes |
|------------------------------|-----------------|-------|
| MongoDB 7 StatefulSet | AWS DocumentDB 5.0 | Connection string + TLS CA bundle differ |
| LocalStack SNS + SQS | AWS SNS + SQS | Only endpoint URL changes |
| k3d cluster | Amazon EKS (Terraform) | Same Kustomize manifests via overlays |
| Self-signed cert-manager CA | AWS ACM at ALB / Let's Encrypt | Ingress annotation changes |
| Sealed Secrets (local key) | External Secrets Operator + AWS Secrets Manager | ESO manifest in `k8s/base/sealed-secrets/` |
| Jaeger all-in-one | AWS X-Ray / Grafana Tempo | OTLP exporter endpoint changes |
| kube-prometheus-stack | Amazon Managed Prometheus + Grafana | Remote-write endpoint in Helm values |
| GHCR (CI push) | Amazon ECR | Image registry URL in kustomize overlay |
