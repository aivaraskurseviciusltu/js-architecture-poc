# Evidence Screenshots

This directory contains Grafana screenshots captured during load tests.

| File | Description |
|------|-------------|
| `grafana-hpa-scale-up.png` | BFF HPA scaling 1→3 replicas during load test (CPU %) |
| `grafana-keda-spike.png` | KEDA scaling inventory/notification 1→6/4 replicas during spike |
| `grafana-queue-drain.png` | SQS queue depth rising then draining after spike ends |
| `grafana-memory-soak.png` | BFF + order-service RSS staying flat over 30-min soak test |
| `grafana-red-metrics.png` | Request rate, error rate, p95/p99 latency during load test |

## How to Capture

1. Start the observability stack:
   ```bash
   helm upgrade --install kube-prometheus-stack prometheus-community/kube-prometheus-stack \
     -f k8s/observability/kube-prometheus-stack-values.yaml \
     --namespace monitoring --create-namespace
   kubectl apply -f k8s/observability/grafana-dashboard-configmap.yaml
   ```

2. Port-forward Grafana:
   ```bash
   kubectl port-forward -n monitoring svc/kube-prometheus-stack-grafana 3001:80
   # Open http://localhost:3001 (admin / admin)
   ```

3. Open the **PoC Services — RED Metrics & Scaling** dashboard.

4. Run a load test in another terminal:
   ```bash
   ./scripts/run-loadtest.sh load
   ```

5. Screenshot the relevant panels and save here.
