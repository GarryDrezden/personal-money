import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthLayout } from '../components/layout/AuthLayout';
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
    <AuthLayout title="Вход" subtitle="Добро пожаловать обратно">
      <form onSubmit={onSubmit}>
        {error && <p className="mb-3 text-sm text-[var(--app-danger)]">{error}</p>}
        <label className="auth-field">
          <span className="auth-field-label">Логин</span>
          <input
            className="auth-field-input"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
            required
          />
        </label>
        <label className="auth-field">
          <span className="auth-field-label">Пароль</span>
          <input
            type="password"
            className="auth-field-input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
          />
        </label>
        <button type="submit" disabled={loading} className="auth-submit btn-primary disabled:opacity-50">
          {loading ? 'Вход…' : 'Войти'}
        </button>
        <p className="auth-footer">
          Нет аккаунта?{' '}
          <Link to="/register" className="font-semibold text-[var(--app-primary)] hover:underline">
            Регистрация
          </Link>
        </p>
      </form>
    </AuthLayout>
  );
}
