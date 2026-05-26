import React from 'react';
import PlayersView from './features/PlayersView';
import LoginView from './features/LoginView';
import {
  fetchServerStatus,
  fetchSession,
  getLastUsername,
  login,
  type AdminSession,
  type ServerStatus,
} from './services/auth';

type AuthState =
  | { stage: 'booting' }
  | { stage: 'open' } // server doesn't require auth (unpaired or auth disabled)
  | { stage: 'signed-out'; submitting: boolean; error: string | null }
  | { stage: 'signed-in'; session: AdminSession };

export default function App(): JSX.Element {
  const [auth, setAuth] = React.useState<AuthState>({ stage: 'booting' });
  const initialUsername = React.useMemo(getLastUsername, []);

  // Initial boot: check server status + current session.
  React.useEffect(() => {
    let cancelled = false;
    const boot = async (): Promise<void> => {
      const status: ServerStatus | null = await fetchServerStatus().catch(() => null);
      const needsAuth = Boolean(status?.paired && status?.authEnabled !== false);
      if (!needsAuth) {
        if (!cancelled) setAuth({ stage: 'open' });
        return;
      }
      try {
        const session = await fetchSession();
        if (cancelled) return;
        if (session) {
          setAuth({ stage: 'signed-in', session });
        } else {
          setAuth({ stage: 'signed-out', submitting: false, error: null });
        }
      } catch {
        if (!cancelled) setAuth({ stage: 'signed-out', submitting: false, error: null });
      }
    };
    void boot();
    return () => {
      cancelled = true;
    };
  }, []);

  // Handle auth-reset events fired by services when they see 401 mid-session.
  React.useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const handler = (): void => {
      setAuth({ stage: 'signed-out', submitting: false, error: 'Your session expired. Please sign in.' });
    };
    window.addEventListener('lox:player-auth-reset', handler);
    return () => window.removeEventListener('lox:player-auth-reset', handler);
  }, []);

  const handleLogin = React.useCallback(async ({ username, password }: { username: string; password: string }) => {
    setAuth({ stage: 'signed-out', submitting: true, error: null });
    try {
      const session = await login(username, password);
      setAuth({ stage: 'signed-in', session });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Sign-in failed.';
      setAuth({ stage: 'signed-out', submitting: false, error: message });
    }
  }, []);

  if (auth.stage === 'booting') {
    return (
      <div className="player-app player-app--booting">
        <p className="player-app__booting-text">Loading…</p>
      </div>
    );
  }

  if (auth.stage === 'signed-out') {
    return (
      <LoginView
        initialUsername={initialUsername}
        submitting={auth.submitting}
        error={auth.error}
        onSubmit={handleLogin}
      />
    );
  }

  // 'open' (no auth) and 'signed-in' both render the players view.
  return (
    <div className="player-app">
      <PlayersView />
    </div>
  );
}
