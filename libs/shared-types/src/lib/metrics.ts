/**
 * Shared Prometheus metrics helpers.
 * Each service calls `initMetrics(appName)` once at bootstrap,
 * then uses the exported counters/histograms.
 */
import { Registry, Counter, Histogram, collectDefaultMetrics, register } from 'prom-client';

export let metricsRegistry: Registry;

// ── RED metrics ──────────────────────────────────────────────────────────────

export let httpRequestsTotal: Counter<string>;
export let httpRequestDurationSeconds: Histogram<string>;
export let httpErrorsTotal: Counter<string>;

// ── Queue / consumer metrics (inventory + notification) ──────────────────────
export let queueMessagesProcessed: Counter<string>;
export let queueProcessingDurationSeconds: Histogram<string>;

export function initMetrics(appName: string): Registry {
  metricsRegistry = new Registry();

  // Default Node.js process metrics (memory, CPU, GC, event loop lag, etc.)
  collectDefaultMetrics({ register: metricsRegistry, prefix: `${appName}_` });

  httpRequestsTotal = new Counter({
    name: `${appName}_http_requests_total`,
    help: 'Total number of HTTP requests',
    labelNames: ['method', 'route', 'status_code'],
    registers: [metricsRegistry],
  });

  httpRequestDurationSeconds = new Histogram({
    name: `${appName}_http_request_duration_seconds`,
    help: 'HTTP request duration in seconds',
    labelNames: ['method', 'route', 'status_code'],
    buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
    registers: [metricsRegistry],
  });

  httpErrorsTotal = new Counter({
    name: `${appName}_http_errors_total`,
    help: 'Total number of HTTP errors (4xx/5xx)',
    labelNames: ['method', 'route', 'status_code'],
    registers: [metricsRegistry],
  });

  queueMessagesProcessed = new Counter({
    name: `${appName}_queue_messages_processed_total`,
    help: 'Total SQS messages processed',
    labelNames: ['queue', 'status'],
    registers: [metricsRegistry],
  });

  queueProcessingDurationSeconds = new Histogram({
    name: `${appName}_queue_processing_duration_seconds`,
    help: 'SQS message processing duration in seconds',
    labelNames: ['queue'],
    buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
    registers: [metricsRegistry],
  });

  return metricsRegistry;
}

// Clear the global registry to avoid duplicate metric errors in tests
export { register as globalRegistry };
