/**
 * OpenTelemetry tracing bootstrap.
 *
 * This file must be required BEFORE any application code so instrumentation
 * patches are installed before the modules are loaded.
 *
 * Usage (in Dockerfile CMD or package.json start script):
 *   node --require ./tracing.js main.js
 *
 * Environment variables:
 *   OTEL_SERVICE_NAME      — service name (default: "unknown-service")
 *   OTEL_EXPORTER_OTLP_ENDPOINT — collector endpoint (default: http://localhost:4318)
 *   OTEL_TRACES_SAMPLER    — "always_on" | "parentbased_always_on" (default: parentbased_always_on)
 */
'use strict';

const { NodeSDK } = require('@opentelemetry/sdk-node');
const { OTLPTraceExporter } = require('@opentelemetry/exporter-trace-otlp-http');
const { getNodeAutoInstrumentations } = require('@opentelemetry/auto-instrumentations-node');
const { Resource } = require('@opentelemetry/resources');
const { SEMRESATTRS_SERVICE_NAME, SEMRESATTRS_SERVICE_VERSION } =
  require('@opentelemetry/semantic-conventions');

const serviceName = process.env.OTEL_SERVICE_NAME ?? 'unknown-service';
const collectorEndpoint =
  process.env.OTEL_EXPORTER_OTLP_ENDPOINT ?? 'http://localhost:4318';

const sdk = new NodeSDK({
  resource: new Resource({
    [SEMRESATTRS_SERVICE_NAME]: serviceName,
    [SEMRESATTRS_SERVICE_VERSION]: process.env.APP_VERSION ?? '0.0.0',
  }),
  traceExporter: new OTLPTraceExporter({ url: `${collectorEndpoint}/v1/traces` }),
  instrumentations: [
    getNodeAutoInstrumentations({
      // HTTP — trace all inbound & outbound HTTP calls
      '@opentelemetry/instrumentation-http': { enabled: true },
      // Express — trace route handlers (NestJS uses Express under the hood)
      '@opentelemetry/instrumentation-express': { enabled: true },
      // MongoDB / Mongoose — trace all DB operations
      '@opentelemetry/instrumentation-mongoose': { enabled: true },
      '@opentelemetry/instrumentation-mongodb': { enabled: true },
      // Reduce noise: disable FS instrumentation
      '@opentelemetry/instrumentation-fs': { enabled: false },
    }),
  ],
});

sdk.start();

// Graceful shutdown — flush pending spans on process exit
process.on('SIGTERM', () => {
  sdk.shutdown().then(() => process.exit(0)).catch(() => process.exit(1));
});
process.on('SIGINT', () => {
  sdk.shutdown().then(() => process.exit(0)).catch(() => process.exit(1));
});
