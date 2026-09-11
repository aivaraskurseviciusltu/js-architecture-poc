/**
 * OpenTelemetry tracing bootstrap — order-service.
 * See apps/bff/src/tracing.js for documentation.
 */
'use strict';

const { NodeSDK } = require('@opentelemetry/sdk-node');
const { OTLPTraceExporter } = require('@opentelemetry/exporter-trace-otlp-http');
const { getNodeAutoInstrumentations } = require('@opentelemetry/auto-instrumentations-node');
const { Resource } = require('@opentelemetry/resources');
const { SEMRESATTRS_SERVICE_NAME, SEMRESATTRS_SERVICE_VERSION } =
  require('@opentelemetry/semantic-conventions');

const serviceName = process.env.OTEL_SERVICE_NAME ?? 'order-service';
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
      '@opentelemetry/instrumentation-http': { enabled: true },
      '@opentelemetry/instrumentation-express': { enabled: true },
      '@opentelemetry/instrumentation-mongoose': { enabled: true },
      '@opentelemetry/instrumentation-mongodb': { enabled: true },
      '@opentelemetry/instrumentation-fs': { enabled: false },
    }),
  ],
});

sdk.start();

process.on('SIGTERM', () => {
  sdk.shutdown().then(() => process.exit(0)).catch(() => process.exit(1));
});
process.on('SIGINT', () => {
  sdk.shutdown().then(() => process.exit(0)).catch(() => process.exit(1));
});
