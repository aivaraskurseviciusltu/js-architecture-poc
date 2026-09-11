/**
 * load.js — sustained load ramp (triggers HPA on BFF + order-service)
 *
 * Ramps to 50 VUs over 2 min, holds for 5 min, ramps down.
 * Watch: kubectl get hpa -n poc -w
 *
 * Run: k6 run loadtest/load.js
 */
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter, Trend } from 'k6/metrics';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const JWT_TOKEN = __ENV.JWT_TOKEN || '';

export const options = {
  stages: [
    { duration: '2m',  target: 50  },   // ramp up
    { duration: '5m',  target: 50  },   // sustained load
    { duration: '2m',  target: 100 },   // push harder
    { duration: '3m',  target: 100 },   // hold peak
    { duration: '2m',  target: 0   },   // ramp down
  ],
  thresholds: {
    http_req_failed:   ['rate<0.02'],    // < 2% errors under load
    http_req_duration: ['p(95)<2000'],   // p95 < 2s
    http_req_duration: ['p(99)<5000'],   // p99 < 5s
  },
};

const orders_created = new Counter('orders_created');
const order_duration = new Trend('order_create_duration_ms');

export default function () {
  const headers = {
    'Content-Type': 'application/json',
    ...(JWT_TOKEN && { Authorization: `Bearer ${JWT_TOKEN}` }),
  };

  const payload = JSON.stringify({
    customerId: `load-customer-${__VU}`,
    items: [
      { productId: 'WIDGET-001', name: 'Widget', quantity: Math.ceil(Math.random() * 5), unitPrice: 9.99 },
      { productId: 'GADGET-002', name: 'Gadget', quantity: 1, unitPrice: 24.99 },
    ],
  });

  const start = Date.now();
  const res = http.post(`${BASE_URL}/api/orders`, payload, { headers });
  order_duration.add(Date.now() - start);

  if (check(res, { 'create 201': (r) => r.status === 201 })) {
    orders_created.add(1);
  }

  sleep(Math.random() * 0.5);   // 0–500ms think time
}
