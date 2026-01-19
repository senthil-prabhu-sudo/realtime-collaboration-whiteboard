import React, { createContext, useContext, useEffect, useState } from 'react';
import { setApiTokenProvider } from '../lib/api';

interface AuthUser {
  id: string;
  email: string;
  displayName?: string;
}

interface AuthContextType {
  user: AuthUser | null;
  token: string | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, displayName: string) => Promise<void>;
  signOut: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);
// API URL
const API_URL = 'https://realtime-collaboration-whiteboard.onrender.com';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  /* ---------------------------------------------
     Restore auth (FIXED – race-free)
  --------------------------------------------- */
  useEffect(() => {
    let restored = false;

    const storedUser = localStorage.getItem('user');
    const storedToken = localStorage.getItem('token');

    if (storedUser && storedToken) {
      try {
        const parsedUser = JSON.parse(storedUser);

        // 🔒 Make token available IMMEDIATELY
        setApiTokenProvider(() => storedToken);

        // Then update React state
        setUser(parsedUser);
        setToken(storedToken);

        restored = true;
      } catch {
        localStorage.removeItem('user');
        localStorage.removeItem('token');
      }
    }

    // Auth init is now complete
    setLoading(false);
  }, []);

  /* ---------------------------------------------
     Keep token provider in sync
     (covers sign-in & refresh)
  --------------------------------------------- */
  useEffect(() => {
    if (token) {
      setApiTokenProvider(() => token);
    }
  }, [token]);

  /* ---------------------------------------------
     Sign up
  --------------------------------------------- */
  const signUp = async (email: string, password: string, displayName: string) => {
    const res = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, displayName }),
    });

    if (!res.ok) {
      throw new Error('Signup failed');
    }

    const data = await res.json();

    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));

    // 🔒 Set provider BEFORE state update
    setApiTokenProvider(() => data.token);

    setUser(data.user);
    setToken(data.token);
  };

  /* ---------------------------------------------
     Sign in
  --------------------------------------------- */
  const signIn = async (email: string, password: string) => {
    const res = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    if (!res.ok) {
      throw new Error('Login failed');
    }

    const data = await res.json();

    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));

    // 🔒 Set provider BEFORE state update
    setApiTokenProvider(() => data.token);

    setUser(data.user);
    setToken(data.token);
  };

  /* ---------------------------------------------
     Sign out
  --------------------------------------------- */
  const signOut = () => {
    localStorage.clear();
    setUser(null);
    setToken(null);
    setApiTokenProvider(() => null);
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}
