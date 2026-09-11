import { BFF_URL, authHeaders } from './client';
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

export async function fetchOrders(): Promise<Order[]> {
  const res = await fetch(`${BFF_URL}/api/orders`, {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error(`Failed to fetch orders (${res.status})`);
  return res.json() as Promise<Order[]>;
}

export async function fetchOrder(id: string): Promise<Order> {
  const res = await fetch(`${BFF_URL}/api/orders/${id}`, {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error(`Order ${id} not found`);
  return res.json() as Promise<Order>;
}
