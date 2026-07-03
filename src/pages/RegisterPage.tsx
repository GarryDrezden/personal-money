import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

export function RegisterPage() {
  const navigate = useNavigate();
  const register = useAuthStore((s) => s.register);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await register(username, password);
      navigate('/', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка регистрации');
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
        <h1 className="text-xl font-semibold text-[var(--app-text)]">Регистрация</h1>
        {error && <p className="text-sm text-[var(--app-danger)]">{error}</p>}
        <label className="block space-y-1">
          <span className="text-sm text-[var(--app-text-muted)]">Логин (мин. 3 символа)</span>
          <input
            className="w-full rounded-lg border border-[var(--app-border)] bg-[var(--app-bg)] px-3 py-2"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
            minLength={3}
            required
          />
        </label>
        <label className="block space-y-1">
          <span className="text-sm text-[var(--app-text-muted)]">Пароль (мин. 6 символов)</span>
          <input
            type="password"
            className="w-full rounded-lg border border-[var(--app-border)] bg-[var(--app-bg)] px-3 py-2"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            minLength={6}
            required
          />
        </label>
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-[var(--app-primary)] py-2.5 font-medium text-white shadow-sm hover:opacity-90 disabled:opacity-50"
        >
          {loading ? 'Создание…' : 'Создать аккаунт'}
        </button>
        <p className="text-center text-sm text-[var(--app-text-muted)]">
          Уже есть аккаунт?{' '}
          <Link to="/login" className="font-medium text-[var(--app-primary)] hover:underline">
            Войти
          </Link>
        </p>
      </form>
    </div>
  );
}
