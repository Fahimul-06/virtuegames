const API_BASE = import.meta.env.VITE_API_URL || '/api';
const AUTH_KEY = 'vgz_auth_token';

type Listener = (event: string, session: any) => void;
const listeners = new Set<Listener>();

function getToken() { return localStorage.getItem(AUTH_KEY); }
function setToken(token: string | null) { token ? localStorage.setItem(AUTH_KEY, token) : localStorage.removeItem(AUTH_KEY); }
async function request(path: string, options: RequestInit = {}) {
  const token = getToken();
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(options.headers || {}) }
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) return { data: null, error: { message: json.error || 'Request failed' } };
  return { data: json, error: null };
}

class QueryBuilder {
  table: string; filters: Record<string, string> = {}; sort?: string; max?: number; single = false; mode: 'select' | 'update' = 'select'; payload: any;
  constructor(table: string) { this.table = table; }
  select(_cols = '*') { return this; }
  eq(field: string, value: string) {
    if (this.mode === 'update') return this.patch(value);
    this.filters[field] = value;
    return this;
  }
  order(field: string, opts?: { ascending?: boolean }) { this.sort = `${field}:${opts?.ascending ? 'asc' : 'desc'}`; return this; }
  limit(n: number) { this.max = n; return this; }
  maybeSingle() { this.single = true; return this.exec(); }
  update(payload: any) { this.mode = 'update'; this.payload = payload; return this; }
  async insert(payload: any) {
    if (Array.isArray(payload)) {
      const results = [];
      for (const row of payload) results.push((await request(`/${this.table}`, { method: 'POST', body: JSON.stringify(row) })).data);
      return { data: results, error: null };
    }
    return request(`/${this.table}`, { method: 'POST', body: JSON.stringify(payload) });
  }
  async patch(id: string) { return request(`/${this.table}/${id}`, { method: 'PATCH', body: JSON.stringify(this.payload) }); }
  async exec() {
    const params = new URLSearchParams(this.filters);
    if (this.sort) params.set('order', this.sort);
    if (this.max) params.set('limit', String(this.max));
    const res = await request(`/${this.table}?${params.toString()}`);
    if (res.error) return res;
    const data = this.single ? (Array.isArray(res.data) ? res.data[0] ?? null : res.data) : res.data;
    return { data, error: null };
  }
  then(resolve: any, reject: any) { return this.exec().then(resolve, reject); }
}

export const supabase = {
  from(table: string) { return new QueryBuilder(table); },
  auth: {
    async getSession() {
      const token = getToken();
      if (!token) return { data: { session: null } };
      const { data, error } = await request('/auth/me');
      if (error) { setToken(null); return { data: { session: null } }; }
      return { data: { session: { access_token: token, user: data.user, profile: data.profile } } };
    },
    onAuthStateChange(callback: Listener) { listeners.add(callback); return { data: { subscription: { unsubscribe: () => listeners.delete(callback) } } }; },
    async signInWithPassword({ email, password }: { email: string; password: string }) {
      const { data, error } = await request('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
      if (!error) { setToken(data.token); listeners.forEach((cb) => cb('SIGNED_IN', { access_token: data.token, user: data.user, profile: data.profile })); }
      return { data, error };
    },
    async signUp({ email, password, options }: { email: string; password: string; options?: { data?: { username?: string } } }) {
      const { data, error } = await request('/auth/register', { method: 'POST', body: JSON.stringify({ email, password, username: options?.data?.username }) });
      if (!error) { setToken(data.token); listeners.forEach((cb) => cb('SIGNED_IN', { access_token: data.token, user: data.user, profile: data.profile })); }
      return { data, error };
    },
    async signOut() { setToken(null); listeners.forEach((cb) => cb('SIGNED_OUT', null)); }
  }
};


export const cloud = {
  async startGameSession(game_id: string, is_trial: boolean) {
    return request('/cloud/game-sessions', { method: 'POST', body: JSON.stringify({ game_id, is_trial }) });
  },
  async stopGameSession(id: string, status = 'ended') {
    return request(`/cloud/game-sessions/${id}/stop`, { method: 'POST', body: JSON.stringify({ status }) });
  },
  async getGameSessionStatus(id: string) {
    return request(`/cloud/game-sessions/${id}/status`);
  }
};
