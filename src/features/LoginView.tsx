import React from 'react';

type Props = {
  initialUsername?: string;
  submitting: boolean;
  error: string | null;
  onSubmit: (input: { username: string; password: string }) => Promise<void>;
};

export default function LoginView({ initialUsername, submitting, error, onSubmit }: Props): JSX.Element {
  const [username, setUsername] = React.useState(initialUsername ?? '');
  const [password, setPassword] = React.useState('');

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    await onSubmit({ username, password });
  };

  return (
    <div className="player-login">
      <form className="player-login__card" onSubmit={handleSubmit}>
        <p className="player-login__eyebrow">lox-audio · player</p>
        <h1 className="player-login__title">Sign in</h1>
        <p className="player-login__hint">Use your controller admin credentials.</p>

        <label className="player-login__field">
          <span>Username</span>
          <input
            type="text"
            autoComplete="username"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            disabled={submitting}
            autoFocus
          />
        </label>

        <label className="player-login__field">
          <span>Password</span>
          <input
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            disabled={submitting}
          />
        </label>

        {error && <p className="player-login__error" role="alert">{error}</p>}

        <button type="submit" className="player-login__submit" disabled={submitting}>
          {submitting ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </div>
  );
}
