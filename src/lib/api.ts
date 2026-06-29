export const API_BASE = import.meta.env.VITE_API_URL || '/api';
export const AUTH_KEY = 'vgz_auth_token';

export async function apiRequest(path: string, options: RequestInit = {}) {
  const token = localStorage.getItem(AUTH_KEY);
  const headers = new Headers(options.headers || {});
  if (!headers.has('Content-Type') && options.body) headers.set('Content-Type', 'application/json');
  if (token) headers.set('Authorization', `Bearer ${token}`);

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || 'Request failed');
  return json;
}
