import { SessionInfo, User, DemoError } from './types';

const SESSION_KEY = 'recipehub_demo_session';

export function getStoredSession(idleTimeoutMinutes = 30): SessionInfo | null {
  if (typeof window === 'undefined') return null;

  const raw = window.sessionStorage.getItem(SESSION_KEY);
  if (!raw) return null;

  try {
    const session = JSON.parse(raw) as SessionInfo;
    const now = Date.now();
    const timeoutMs = idleTimeoutMinutes * 60 * 1000;

    if (now - session.lastActiveAt > timeoutMs) {
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
    canApprove: user.canApprove,
    lastActiveAt: Date.now(),
  };

  window.sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
  return session;
}

export function touchSession(): void {
  if (typeof window === 'undefined') return;

  const raw = window.sessionStorage.getItem(SESSION_KEY);
  if (!raw) return;

  try {
    const session = JSON.parse(raw) as SessionInfo;
    session.lastActiveAt = Date.now();
    window.sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
  } catch {
    // Ignore invalid JSON
  }
}

export function clearSession(): void {
  if (typeof window === 'undefined') return;
  window.sessionStorage.removeItem(SESSION_KEY);
}
