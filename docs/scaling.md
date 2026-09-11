# Scaling Strategy

## Overview

The platform uses multiple complementary scaling mechanisms to handle both
gradual load increases and sudden spikes, while keeping stateless services
horizontally scalable and MongoDB reads distributed.

---

## 1. Stateless HTTP Services (BFF + Order Service)

All NestJS services are stateless — no in-process session state, no sticky sessions.
Configuration and secrets are injected via environment variables at runtime.

**Horizontal Pod Autoscaler (HPA)**

```yaml
# k8s/base/bff/hpa.yaml
minReplicas: 1
maxReplicas: 5
targetCPUUtilizationPercentage: 70
```

- BFF and order-service both have HPAs targeting 70% CPU.
- During the load test, BFF scaled **1 → 3** replicas and order-service **1 → 2** replicas.
- Scale-down has a 5-minute cooldown to prevent thrashing.

**Load test evidence:**
```
HPA OBSERVED: bff 1→3 replicas at t=3m20s (CPU 78%)
HPA OBSERVED: order-service 1→2 replicas at t=4m10s (CPU 65%)
Peak throughput: ~30 RPS at 100 VUs
```
See [`docs/loadtest-results/load-result.txt`](loadtest-results/load-result.txt).

---

## 2. Event-Driven Consumer Scaling (KEDA)

Inventory and notification services are pure SQS consumers — they have no HTTP traffic,
so CPU-based HPA cannot detect their load. **KEDA** polls the SQS queue depth and
scales replicas proportionally.

```yaml
# k8s/base/keda/scaled-objects.yaml
trigger:
  type: aws-sqs-queue
  queueLength: "5"      # 1 replica per 5 queued messages
minReplicaCount: 1
maxReplicaCount: 10
```

**How KEDA replaces CPU-based HPA for consumers:**

| Mechanism | HPA | KEDA |
|-----------|-----|------|
| Trigger | CPU / memory | Queue depth |
| Reaction time | ~1-2 min (CPU sampling) | ~15s (poll interval) |
| Idle replicas | 1 minimum | 0 possible (scale-to-zero) |
| Use case | HTTP request handlers | Queue/event consumers |

**Load test evidence (spike scenario):**
```
KEDA OBSERVED: inventory-service 1→6 replicas at t=1m05s (queue depth 42)
KEDA OBSERVED: notification-service 1→4 replicas at t=1m18s (queue depth 28)
Queue fully drained in ~2 min after spike ended
```
See [`docs/loadtest-results/spike-result.txt`](loadtest-results/spike-result.txt).

---

## 3. MongoDB Read Scaling

| Environment | Strategy |
|-------------|----------|
| Local (k3d) | Single StatefulSet — primary only |
| Production (Atlas) | M10+ tier with auto-scaling; read preference `secondaryPreferred` for inventory/notification queries distributes reads across secondaries |
| Production (DocumentDB) | 1 writer + up to 15 read replicas; connection string: `readPreference=secondaryPreferred` |

**Connection string (DocumentDB):**
```
mongodb://user:pass@cluster.docdb.amazonaws.com:27017/?tls=true
  &tlsCAFile=/etc/ssl/certs/rds-combined-ca-bundle.pem
  &replicaSet=rs0
  &readPreference=secondaryPreferred
  &retryWrites=false
```

**Atlas auto-scaling:**
- Atlas M10+ clusters support auto-scaling of compute tier.
- Enable: `Cluster → Auto-scale → Cluster Tier + Storage`.

---

## 4. Caching Strategy

No Redis caching is implemented in this PoC; the Elasticache module is provisioned
in Terraform for production use. Recommended approach:

| Cache use case | TTL | Key pattern |
|----------------|-----|-------------|
| Order read (`GET /api/orders/:id`) | 30s | `order:{id}` |
| Inventory stock levels | 5s | `inv:{sku}` |
| Rate limit counters | 60s | `rl:{ip}` (handled by `@nestjs/throttler` in-memory; swap to Redis store for multi-replica) |

---

## 5. Scalability Summary

| Layer | Mechanism | Min → Max |
|-------|-----------|-----------|
| Frontend | nginx static serving | 1 → N (stateless) |
| BFF | HPA (CPU 70%) | 1 → 5 replicas |
| Order Service | HPA (CPU 70%) | 1 → 5 replicas |
| Inventory Service | KEDA (SQS depth) | 1 → 10 replicas |
| Notification Service | KEDA (SQS depth) | 1 → 10 replicas |
| MongoDB (Atlas) | Cluster auto-scaling + read replicas | M10 → M50 |
| SQS | Managed — scales automatically | unlimited |
| SNS | Managed — scales automatically | unlimited |

---

## 6. Load Test Results Summary

| Test | Duration | Peak VUs | Peak RPS | p95 | Error Rate |
|------|----------|----------|----------|-----|------------|
| Smoke | 30s | 1 | 2/s | 112ms | 0.00% |
| Load | 14m | 100 | 30/s | 568ms | 0.04% |
| Spike | 4m20s | 200 | 125/s | 2.81s | 2.75% |
| Soak | 32m | 30 | 28.8/s | 188ms | 0.02% |

**Key finding:** p95 latency stayed within SLO in all scenarios (500ms smoke,
2s load, 5s spike, 1s soak). No memory leak was detected during the 30-minute soak.
The spike test confirmed KEDA scales consumers in < 90s of queue buildup.

See [`docs/loadtest-results/`](loadtest-results/) for full k6 output.
