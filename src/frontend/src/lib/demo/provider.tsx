'use client';

import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { SessionInfo, User, DemoSettings } from './types';
import { BackendRepository, backendRepo as repo } from '@/lib/api/backend-repository';
import { getStoredSession, touchSession, clearSession } from './session';
import { ApiError } from '@/lib/api/client';

interface DemoContextValue {
  session: SessionInfo | null;
  currentUser: User | null;
  settings: DemoSettings | null;
  repo: BackendRepository;
  loading: boolean;
  dataVersion: number;
  login: (email: string, password: string) => Promise<SessionInfo>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
  touch: () => void;
}

const DemoContext = createContext<DemoContextValue | null>(null);

export function DemoProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<SessionInfo | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [settings, setSettings] = useState<DemoSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [dataVersion, setDataVersion] = useState(0);

  const refresh = useCallback(async () => {
    try {
      let idleTimeout = 30;
      try {
        const activeSettings = await repo.getSettings();
        setSettings(activeSettings);
        idleTimeout = activeSettings.idleTimeoutMinutes;
      } catch {
        // Fallback default timeout if settings unavailable temporarily
      }

      const stored = getStoredSession(idleTimeout);
      if (!stored) {
        setSession(null);
        setCurrentUser(null);
        return;
      }

      setSession(stored);

      try {
        const freshUser = await repo.getCurrentUser(stored);
        if (!freshUser || freshUser.isLocked) {
          setSession(null);
          setCurrentUser(null);
          clearSession();
        } else {
          setSession(getStoredSession(idleTimeout));
          setCurrentUser(freshUser);
        }
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) {
          setSession(null);
          setCurrentUser(null);
          clearSession();
        }
        // Transient network/5xx: keep stored session
      }
    } catch {
      // General safety catch
    } finally {
      setDataVersion((v) => v + 1);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    const cleared = () => { setSession(null); setCurrentUser(null); };
    window.addEventListener('recipehub:session-cleared', cleared);
    return () => window.removeEventListener('recipehub:session-cleared', cleared);
  }, []);

  // Periodic idle check (every 30 seconds)
  useEffect(() => {
    if (!session || !settings) return;
    const interval = setInterval(() => {
      const current = getStoredSession(settings.idleTimeoutMinutes);
      if (!current) {
        setSession(null);
        setCurrentUser(null);
      } else {
        void repo.getCurrentUser(current).then(user => {
          if (!user) { setSession(null); setCurrentUser(null); return; }
          setCurrentUser(user);
          setSession(previous => previous && (previous.role !== user.role || previous.fullName !== user.fullName)
            ? getStoredSession(settings.idleTimeoutMinutes) : previous);
        }).catch((error) => {
          if (error instanceof ApiError && error.status === 401) {
            setSession(null);
            setCurrentUser(null);
          }
        });
      }
    }, 30000);
    return () => clearInterval(interval);
  }, [session, settings]);

  const login = useCallback(
    async (email: string, password: string): Promise<SessionInfo> => {
      const newSession = await repo.login(email, password);
      await refresh();
      return newSession;
    },
    [refresh]
  );

  const logout = useCallback(async (): Promise<void> => {
    try { await repo.logout(session); }
    finally {
      setSession(null);
      setCurrentUser(null);
      setDataVersion((v) => v + 1);
    }
  }, [session]);

  const touch = useCallback(() => {
    touchSession();
  }, []);

  const value = useMemo<DemoContextValue>(
    () => ({
      session,
      currentUser,
      settings,
      repo,
      loading,
      dataVersion,
      login,
      logout,
      refresh,
      touch,
    }),
    [session, currentUser, settings, loading, dataVersion, login, logout, refresh, touch]
  );

  return <DemoContext.Provider value={value}>{children}</DemoContext.Provider>;
}

export function useDemo(): DemoContextValue {
  const ctx = useContext(DemoContext);
  if (!ctx) {
    throw new Error('useDemo must be used within a DemoProvider');
  }
  return ctx;
}
