import { Order } from '@poc/shared-types';

const BFF_URL = import.meta.env['VITE_BFF_URL'] ?? 'http://localhost:3000';

export async function createOrder(payload: {
  customerId: string;
  items: { productId: string; name: string; quantity: number; unitPrice: number }[];
}): Promise<Order> {
  const res = await fetch(`${BFF_URL}/api/orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`Failed to create order: ${res.status}`);
  return res.json() as Promise<Order>;
}

export async function fetchOrder(id: string): Promise<Order> {
  const res = await fetch(`${BFF_URL}/api/orders/${id}`);
  if (!res.ok) throw new Error(`Failed to fetch order ${id}: ${res.status}`);
  return res.json() as Promise<Order>;
}
