
const API_BASE = import.meta.env.VITE_API_URL || '/api';
const AUTH_KEY = 'vgz_auth_token';

export async function apiRequest(path: string, options: RequestInit = {}) {
  const token = localStorage.getItem(AUTH_KEY);
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(options.headers || {}) }
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || 'Request failed');
  return json;
}
