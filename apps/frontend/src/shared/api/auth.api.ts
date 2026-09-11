import { BFF_URL } from './client';

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

export function redirectToCognito(): void {
  const domain    = import.meta.env['VITE_COGNITO_DOMAIN'];
  const clientId  = import.meta.env['VITE_COGNITO_CLIENT_ID'];
  const redirect  = import.meta.env['VITE_COGNITO_REDIRECT_URI'] ?? window.location.origin;

  const url = new URL(`https://${domain}/login`);
  url.searchParams.set('client_id',     clientId);
  url.searchParams.set('response_type', 'token');
  url.searchParams.set('scope',         'openid email profile');
  url.searchParams.set('redirect_uri',  redirect);

  window.location.assign(url.toString());
}

export function parseCognitoCallbackHash(): LoginResult | null {
  if (typeof window === 'undefined') return null;
  const hash = new URLSearchParams(window.location.hash.replace('#', ''));
  const idToken = hash.get('id_token');
  if (!idToken) return null;

  try {
    const payload = JSON.parse(atob(idToken.split('.')[1]));
    window.location.hash = '';
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
