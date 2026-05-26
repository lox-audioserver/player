// Player-app auth: shares the audioserver's `/admin/api/auth/*` endpoints
// with the webadmin so the same session cookie covers both apps.

const API_BASE = '/admin/api';
const LAST_USER_KEY = 'lox.player.lastUser';

export type AdminSession = {
  username: string;
  loginAt: number;
  expiresAt: number;
};

export type ServerStatus = {
  paired?: boolean;
  authEnabled?: boolean;
};

function isBrowser(): boolean {
  return typeof window !== 'undefined';
}

export function getLastUsername(): string {
  if (!isBrowser()) return '';
  return window.localStorage.getItem(LAST_USER_KEY) ?? '';
}

function parseLoginError(raw: string): string {
  const sanitize = (text: string): string => text.replace(/miniserver/gi, 'controller');
  try {
    const parsed = JSON.parse(raw) as { error?: string; message?: string };
    const code = parsed.error ?? '';
    if (code === 'invalid-credentials') return 'Invalid username or password.';
    if (code === 'insufficient-permissions') return 'This user is not an admin account.';
    if (code === 'miniserver-unreachable') return 'Cannot reach the controller.';
    if (code === 'miniserver-auth-required') return 'Authentication starts after pairing is complete.';
    if (parsed.message && parsed.message.trim()) return sanitize(parsed.message.trim());
    if (code) return code;
    return sanitize(raw);
  } catch {
    return sanitize(raw) || 'Unable to sign in right now.';
  }
}

function parseSession(raw: unknown): AdminSession | null {
  if (!raw || typeof raw !== 'object') return null;
  const payload = raw as Partial<AdminSession>;
  if (typeof payload.username !== 'string' || payload.username.trim().length === 0) return null;
  if (typeof payload.loginAt !== 'number' || !Number.isFinite(payload.loginAt)) return null;
  if (typeof payload.expiresAt !== 'number' || !Number.isFinite(payload.expiresAt)) return null;
  return {
    username: payload.username,
    loginAt: payload.loginAt,
    expiresAt: payload.expiresAt,
  };
}

export async function fetchServerStatus(signal?: AbortSignal): Promise<ServerStatus | null> {
  try {
    const res = await fetch(`${API_BASE}/info`, { credentials: 'include', signal });
    if (!res.ok) return null;
    return (await res.json()) as ServerStatus;
  } catch {
    return null;
  }
}

export async function fetchSession(): Promise<AdminSession | null> {
  const res = await fetch(`${API_BASE}/auth/me`, {
    method: 'GET',
    credentials: 'include',
  });
  if (res.status === 401) return null;
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(parseLoginError(body || `Request failed (${res.status})`));
  }
  const payload = (await res.json().catch(() => null)) as unknown;
  return parseSession(payload);
}

export async function login(username: string, password: string): Promise<AdminSession> {
  const user = username.trim();
  if (!user) throw new Error('Enter a username.');
  if (!password.trim()) throw new Error('Enter a password.');

  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: user, password }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(parseLoginError(body || `Request failed (${res.status})`));
  }

  if (isBrowser()) {
    window.localStorage.setItem(LAST_USER_KEY, user);
  }

  const payload = (await res.json().catch(() => null)) as unknown;
  const parsed = parseSession(payload);
  if (!parsed) throw new Error('Authentication succeeded but session response was invalid.');
  return parsed;
}

export async function logout(): Promise<void> {
  await fetch(`${API_BASE}/auth/logout`, {
    method: 'POST',
    credentials: 'include',
  }).catch(() => undefined);
}

export function emitAuthReset(): void {
  if (!isBrowser()) return;
  window.dispatchEvent(new Event('lox:player-auth-reset'));
}
