import { useState } from 'react';
import { BrandMark } from '../components/brand-mark';
import { login } from '../lib/api';

export function Login({ onSuccess }: { onSuccess: () => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    const form = new FormData(event.currentTarget);
    const result = await login(String(form.get('email')), String(form.get('password')));
    setBusy(false);
    if (result.ok) onSuccess();
    else setError(result.error ?? 'Login failed');
  }

  return (
    <div className="login-screen">
      <form className="login-card" onSubmit={submit}>
        <div className="login-brand">
          <BrandMark className="login-mark" />
          <span>ERP</span>
        </div>
        <label>
          Email
          <input name="email" type="email" required autoFocus placeholder="owner@blackhorse.shoes" />
        </label>
        <label>
          Password
          <input name="password" type="password" required minLength={8} placeholder="••••••••" />
        </label>
        {error && <p className="login-error">{error}</p>}
        <button className="complete" type="submit" disabled={busy}>
          {busy ? 'Signing in…' : 'Sign in'}
        </button>
        <p className="login-hint">Staff accounts are created by the owner in Settings.</p>
      </form>
    </div>
  );
}
