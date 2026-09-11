export const BFF_URL = import.meta.env['VITE_BFF_URL'] ?? 'http://localhost:3000';
export const AUTH_MODE = (import.meta.env['VITE_AUTH_MODE'] ?? 'local') as 'local' | 'cognito';

// In-memory only — not localStorage, safer against XSS
let _token: string | null = null;

export function setToken(token: string): void { _token = token; }
export function getToken(): string | null      { return _token; }
export function clearToken(): void             { _token = null; }

export function authHeaders(): Record<string, string> {
  return _token ? { Authorization: `Bearer ${_token}` } : {};
}
