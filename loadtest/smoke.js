/**
 * smoke.js — minimal sanity check (1 VU, 30s)
 * Verifies the pipeline is up before running heavier tests.
 *
 * Run: k6 run loadtest/smoke.js
 */
import http from 'k6/http';
import { check, sleep } from 'k6';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const JWT_TOKEN = __ENV.JWT_TOKEN || '';

export const options = {
  vus: 1,
  duration: '30s',
  thresholds: {
    http_req_failed: ['rate<0.01'],          // < 1% errors
    http_req_duration: ['p(95)<500'],        // p95 < 500ms
  },
};

export default function () {
  const headers = {
    'Content-Type': 'application/json',
    ...(JWT_TOKEN && { Authorization: `Bearer ${JWT_TOKEN}` }),
  };

  // Health check
  const health = http.get(`${BASE_URL}/health`, { headers });
  check(health, { 'health 200': (r) => r.status === 200 });

  // Create order
  const payload = JSON.stringify({
    customerId: 'smoke-test-customer',
    items: [{ productId: 'WIDGET-001', name: 'Widget', quantity: 1, unitPrice: 9.99 }],
  });

  const create = http.post(`${BASE_URL}/api/orders`, payload, { headers });
  check(create, {
    'create order 201': (r) => r.status === 201,
    'has orderId': (r) => {
      try {
        return JSON.parse(r.body)._id !== undefined;
      } catch {
        return false;
      }
    },
  });

  sleep(1);
}
