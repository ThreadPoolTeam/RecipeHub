'use client';

import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { SessionInfo, User, DemoSettings } from './types';
import { repo, DemoRepository } from './repository';
import { getStoredSession, touchSession, clearSession } from './session';

interface DemoContextValue {
  session: SessionInfo | null;
  currentUser: User | null;
  settings: DemoSettings | null;
  repo: DemoRepository;
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
      const activeSettings = await repo.getSettings();
      setSettings(activeSettings);

      const stored = getStoredSession(activeSettings.idleTimeoutMinutes);
      if (!stored) {
        setSession(null);
        setCurrentUser(null);
        return;
      }

      const freshUser = await repo.getCurrentUser(stored);
      if (!freshUser || freshUser.isLocked) {
        setSession(null);
        setCurrentUser(null);
        clearSession();
      } else {
        setSession(stored);
        setCurrentUser(freshUser);
      }
    } catch {
      // Storage or init error
    } finally {
      setDataVersion((v) => v + 1);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Periodic idle check (every 30 seconds)
  useEffect(() => {
    if (!session || !settings) return;
    const interval = setInterval(() => {
      const current = getStoredSession(settings.idleTimeoutMinutes);
      if (!current) {
        setSession(null);
        setCurrentUser(null);
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
    await repo.logout(session);
    setSession(null);
    setCurrentUser(null);
    setDataVersion((v) => v + 1);
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
