import { SessionInfo, User, DemoError } from './types';

const SESSION_KEY = 'recipehub_backend_session';

export function getStoredSession(idleTimeoutMinutes = 30): SessionInfo | null {
  if (typeof window === 'undefined') return null;

  const raw = window.sessionStorage.getItem(SESSION_KEY);
  if (!raw) return null;

  try {
    const session = JSON.parse(raw) as SessionInfo;
    const now = Date.now();
    const timeoutMs = idleTimeoutMinutes * 60 * 1000;

    if (!session.accessToken || !session.expiresAt || !Number.isFinite(Date.parse(session.expiresAt)) ||
        now >= Date.parse(session.expiresAt) || now - session.lastActiveAt > timeoutMs) {
      window.sessionStorage.removeItem(SESSION_KEY);
      return null;
    }

    return session;
  } catch {
    window.sessionStorage.removeItem(SESSION_KEY);
    return null;
  }
}

export function saveSession(user: User): SessionInfo {
  if (typeof window === 'undefined') {
    throw new DemoError('StorageUnavailable', 'Môi trường không có sessionStorage');
  }

  const session: SessionInfo = {
    userId: user.id,
    email: user.email,
    fullName: user.fullName,
    role: user.role,
    lastActiveAt: Date.now(),
  };

  window.sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
  return session;
}

export function touchSession(): void {
  if (typeof window === 'undefined') return;
  const session = getStoredSession();
  if (!session) return;
  session.lastActiveAt = Date.now();
  window.sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function saveBackendSession(user: User, tokens: { accessToken: string; refreshToken: string; expiresAt: string }): SessionInfo {
  const session = { ...saveSession(user), ...tokens };
  window.sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
  return session;
}

export function updateSessionUser(user: User): SessionInfo | null {
  const session = getStoredSession();
  if (!session) return null;
  const updated = { ...session, email: user.email, fullName: user.fullName, role: user.role };
  window.sessionStorage.setItem(SESSION_KEY, JSON.stringify(updated));
  return updated;
}

export function clearSession(): void {
  if (typeof window === 'undefined') return;
  window.sessionStorage.removeItem(SESSION_KEY);
  window.sessionStorage.removeItem('recipehub_demo_session');
  window.dispatchEvent(new Event('recipehub:session-cleared'));
}
