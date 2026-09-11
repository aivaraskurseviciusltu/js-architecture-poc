/**
 * spike.js — sudden burst to trigger KEDA scale-out on SQS queues
 *
 * Blasts 200 VUs for 1 min then drops to 0.
 * Each order creation publishes an SNS event → SQS queues fill up →
 * KEDA detects depth > 5/replica → scales inventory + notification consumers.
 *
 * Watch: kubectl get scaledobject -n poc -w
 *        kubectl get pods -n poc -w
 *
 * Run: k6 run loadtest/spike.js
 */
import http from 'k6/http';
import { check, sleep } from 'k6';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const JWT_TOKEN = __ENV.JWT_TOKEN || '';

export const options = {
  stages: [
    { duration: '10s', target: 0   },   // idle
    { duration: '1m',  target: 200 },   // spike
    { duration: '30s', target: 200 },   // hold spike
    { duration: '10s', target: 0   },   // drop
    { duration: '2m',  target: 0   },   // drain & observe scale-down
  ],
  thresholds: {
    http_req_failed:   ['rate<0.05'],    // allow up to 5% errors during spike
    http_req_duration: ['p(95)<5000'],   // p95 < 5s (service may be starting)
  },
};

export default function () {
  const headers = {
    'Content-Type': 'application/json',
    ...(JWT_TOKEN && { Authorization: `Bearer ${JWT_TOKEN}` }),
  };

  const payload = JSON.stringify({
    customerId: `spike-vu-${__VU}`,
    items: [{ productId: 'SPIKE-ITEM', name: 'Spike Item', quantity: 1, unitPrice: 1.00 }],
  });

  const res = http.post(`${BASE_URL}/api/orders`, payload, { headers });
  check(res, { 'accepted': (r) => r.status === 201 || r.status === 202 });

  // No sleep — maximum throughput
}
