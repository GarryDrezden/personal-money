import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

export function LoginPage() {
  const navigate = useNavigate();
  const login = useAuthStore((s) => s.login);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await login(username, password);
      navigate('/', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка входа');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--app-bg)] p-6">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-sm space-y-4 rounded-2xl border border-[var(--app-border)] bg-[var(--app-card)] p-6 shadow-lg"
      >
        <h1 className="text-xl font-semibold text-[var(--app-text)]">Вход</h1>
        {error && <p className="text-sm text-[var(--app-danger)]">{error}</p>}
        <label className="block space-y-1">
          <span className="text-sm text-[var(--app-text-muted)]">Логин</span>
          <input
            className="w-full rounded-lg border border-[var(--app-border)] bg-[var(--app-bg)] px-3 py-2"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
            required
          />
        </label>
        <label className="block space-y-1">
          <span className="text-sm text-[var(--app-text-muted)]">Пароль</span>
          <input
            type="password"
            className="w-full rounded-lg border border-[var(--app-border)] bg-[var(--app-bg)] px-3 py-2"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
          />
        </label>
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-[var(--app-primary)] py-2.5 font-medium text-white shadow-sm hover:opacity-90 disabled:opacity-50"
        >
          {loading ? 'Вход…' : 'Войти'}
        </button>
        <p className="text-center text-sm text-[var(--app-text-muted)]">
          Нет аккаунта?{' '}
          <Link to="/register" className="font-medium text-[var(--app-primary)] hover:underline">
            Регистрация
          </Link>
        </p>
      </form>
    </div>
  );
}
