# Architecture Documentation

## Overview

This document describes the architecture of the `js-architecture-poc` — a fullstack,
event-driven, cloud-native application demonstrating production-grade patterns across
all layers of a modern web system.

---

## AWS Production Architecture

![AWS Production Architecture](aws-production-architecture.drawio.png)

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
