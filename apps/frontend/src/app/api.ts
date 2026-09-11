const BFF_URL     = import.meta.env['VITE_BFF_URL']  ?? 'http://localhost:3000';
export const AUTH_MODE = (import.meta.env['VITE_AUTH_MODE'] ?? 'local') as 'local' | 'cognito';

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

// ── Local dev login (POST /api/auth/login) ────────────────────────────────────
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

// ── Cognito: redirect to Hosted UI ────────────────────────────────────────────
// When VITE_AUTH_MODE=cognito the app redirects here instead of showing LoginPage.
// After login, Cognito redirects back with ?code=... (PKCE) or a hash token.
export function redirectToCognito(): void {
  const domain   = import.meta.env['VITE_COGNITO_DOMAIN'];       // e.g. my-app.auth.us-east-1.amazoncognito.com
  const clientId = import.meta.env['VITE_COGNITO_CLIENT_ID'];
  const redirect = import.meta.env['VITE_COGNITO_REDIRECT_URI'] ?? window.location.origin;

  const url = new URL(`https://${domain}/login`);
  url.searchParams.set('client_id',     clientId);
  url.searchParams.set('response_type', 'token');           // implicit — swap for 'code' + PKCE in production
  url.searchParams.set('scope',         'openid email profile');
  url.searchParams.set('redirect_uri',  redirect);

  window.location.assign(url.toString());
}

// ── Cognito: parse the id_token from the URL hash after redirect ──────────────
// Cognito implicit flow returns: #id_token=xxx&access_token=yyy&...
export function parseCognitoCallbackHash(): LoginResult | null {
  if (typeof window === 'undefined') return null;
  const hash = new URLSearchParams(window.location.hash.replace('#', ''));
  const idToken = hash.get('id_token');
  if (!idToken) return null;

  // Decode the JWT payload (no verification — the BFF verifies against JWKS)
  try {
    const payload = JSON.parse(atob(idToken.split('.')[1]));
    window.location.hash = '';   // clean the URL
    return {
      accessToken: idToken,
      user: {
        sub:      payload['sub']              ?? '',
        username: payload['cognito:username'] ?? payload['email'] ?? '',
        email:    payload['email']            ?? '',
        roles:    payload['cognito:groups']   ?? [],
      },
    };
  } catch {
    return null;
  }
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
