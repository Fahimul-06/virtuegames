import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { Profile } from '../lib/types';
import { apiRequest, AUTH_KEY } from '../lib/api';

interface User { id: string; email?: string }
interface Session { access_token: string; user: User; profile?: Profile }

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string, username: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function saveAuth(token: string, user: User, profile: Profile) {
  localStorage.setItem(AUTH_KEY, token);
  localStorage.setItem('vgz_auth_user', JSON.stringify(user));
  localStorage.setItem('vgz_auth_profile', JSON.stringify(profile));
}

function clearAuth() {
  localStorage.removeItem(AUTH_KEY);
  localStorage.removeItem('vgz_auth_user');
  localStorage.removeItem('vgz_auth_profile');
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const applyAuth = (token: string, nextUser: User, nextProfile: Profile) => {
    saveAuth(token, nextUser, nextProfile);
    const nextSession = { access_token: token, user: nextUser, profile: nextProfile };
    setSession(nextSession);
    setUser(nextUser);
    setProfile(nextProfile);
  };

  const refreshProfile = async () => {
    try {
      const token = localStorage.getItem(AUTH_KEY);
      if (!token) return;
      const data = await apiRequest('/auth/me');
      setUser(data.user);
      setProfile(data.profile);
      setSession({ access_token: token, user: data.user, profile: data.profile });
      localStorage.setItem('vgz_auth_user', JSON.stringify(data.user));
      localStorage.setItem('vgz_auth_profile', JSON.stringify(data.profile));
    } catch {
      clearAuth();
      setSession(null);
      setUser(null);
      setProfile(null);
    }
  };

  useEffect(() => {
    (async () => {
      const token = localStorage.getItem(AUTH_KEY);
      if (!token) {
        setLoading(false);
        return;
      }

      const cachedUser = localStorage.getItem('vgz_auth_user');
      const cachedProfile = localStorage.getItem('vgz_auth_profile');
      if (cachedUser && cachedProfile) {
        const nextUser = JSON.parse(cachedUser);
        const nextProfile = JSON.parse(cachedProfile);
        setSession({ access_token: token, user: nextUser, profile: nextProfile });
        setUser(nextUser);
        setProfile(nextProfile);
      }

      await refreshProfile();
      setLoading(false);
    })();
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      const data = await apiRequest('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      applyAuth(data.token, data.user, data.profile);
      return { error: null };
    } catch (e) {
      return { error: e instanceof Error ? e.message : 'Login failed.' };
    }
  };

  const signUp = async (email: string, password: string, username: string) => {
    try {
      const data = await apiRequest('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ email, password, username }),
      });
      applyAuth(data.token, data.user, data.profile);
      return { error: null };
    } catch (e) {
      return { error: e instanceof Error ? e.message : 'Registration failed.' };
    }
  };

  const signOut = async () => {
    clearAuth();
    setSession(null);
    setUser(null);
    setProfile(null);
  };

  return (
    <AuthContext.Provider value={{ session, user, profile, loading, signIn, signUp, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
