/**
 * soak.js — extended stability test (30 VUs for 30 min)
 *
 * Purpose: verify no memory leaks, goroutine leaks, connection pool exhaustion,
 *          or gradual error rate increase over time.
 *
 * Run: k6 run loadtest/soak.js
 * Monitor: watch Grafana "Pod Memory RSS" panel — should stay flat
 */
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const JWT_TOKEN = __ENV.JWT_TOKEN || '';

export const options = {
  stages: [
    { duration: '5m',  target: 30 },    // ramp up
    { duration: '25m', target: 30 },    // sustained soak
    { duration: '2m',  target: 0  },    // ramp down
  ],
  thresholds: {
    http_req_failed:   ['rate<0.01'],    // < 1% errors over entire run
    http_req_duration: ['p(95)<1000'],   // p95 < 1s throughout soak
    // Custom: late-run error rate should not worsen
    'late_errors':     ['rate<0.02'],
  },
};

const late_errors = new Rate('late_errors');

export default function () {
  const headers = {
    'Content-Type': 'application/json',
    ...(JWT_TOKEN && { Authorization: `Bearer ${JWT_TOKEN}` }),
  };

  // Mix of reads and writes to stress connection pools
  const iteration = __ITER % 3;

  if (iteration < 2) {
    // Create order (2 out of 3 iterations)
    const payload = JSON.stringify({
      customerId: `soak-vu-${__VU}`,
      items: [{ productId: 'SOAK-ITEM', name: 'Soak Item', quantity: 1, unitPrice: 5.00 }],
    });
    const res = http.post(`${BASE_URL}/api/orders`, payload, { headers });
    const ok = check(res, { 'create 201': (r) => r.status === 201 });
    // Track errors — after 10min mark (__ITER > some threshold) we call them "late"
    if (__ITER > 1000) late_errors.add(!ok);
  } else {
    // Health check (1 out of 3 iterations)
    const res = http.get(`${BASE_URL}/health`, { headers });
    check(res, { 'health 200': (r) => r.status === 200 });
  }

  sleep(1);   // 1s think time → ~30 RPS steady state
}
