const BFF_URL = import.meta.env['VITE_BFF_URL'] ?? 'http://localhost:3000';

// ── Token storage (in-memory only — not localStorage, safer against XSS) ──────
let _token: string | null = null;

export function setToken(token: string): void  { _token = token; }
export function getToken(): string | null       { return _token; }
export function clearToken(): void              { _token = null; }

function authHeaders(): Record<string, string> {
  return _token ? { Authorization: `Bearer ${_token}` } : {};
}

// ── Auth ──────────────────────────────────────────────────────────────────────
export interface LoginResult {
  accessToken: string;
  user: { sub: string; username: string; email: string; roles: string[] };
}

export async function login(username: string, password: string): Promise<LoginResult> {
  const res = await fetch(`${BFF_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { message?: string };
    throw new Error(err.message ?? 'Invalid credentials');
  }
  return res.json() as Promise<LoginResult>;
}

// ── Orders ────────────────────────────────────────────────────────────────────
import type { Order } from '@poc/shared-types';

export interface CreateOrderPayload {
  customerId: string;
  items: { productId: string; name: string; quantity: number; unitPrice: number }[];
}

export async function createOrder(payload: CreateOrderPayload): Promise<Order> {
  const res = await fetch(`${BFF_URL}/api/orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { message?: unknown };
    throw new Error(String(err.message ?? `HTTP ${res.status}`));
  }
  return res.json() as Promise<Order>;
}

export async function fetchOrder(id: string): Promise<Order> {
  const res = await fetch(`${BFF_URL}/api/orders/${id}`, {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error(`Order ${id} not found`);
  return res.json() as Promise<Order>;
}
