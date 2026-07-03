import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthLayout } from '../components/layout/AuthLayout';
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
    <AuthLayout title="Регистрация" subtitle="Создайте аккаунт — настройка займёт пару минут">
      <form onSubmit={onSubmit}>
        {error && <p className="mb-3 text-sm text-[var(--app-danger)]">{error}</p>}
        <label className="auth-field">
          <span className="auth-field-label">Логин (мин. 3 символа)</span>
          <input
            className="auth-field-input"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
            minLength={3}
            required
          />
        </label>
        <label className="auth-field">
          <span className="auth-field-label">Пароль (мин. 6 символов)</span>
          <input
            type="password"
            className="auth-field-input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            minLength={6}
            required
          />
        </label>
        <button type="submit" disabled={loading} className="auth-submit btn-primary disabled:opacity-50">
          {loading ? 'Создание…' : 'Создать аккаунт'}
        </button>
        <p className="auth-footer">
          Уже есть аккаунт?{' '}
          <Link to="/login" className="font-semibold text-[var(--app-primary)] hover:underline">
            Войти
          </Link>
        </p>
      </form>
    </AuthLayout>
  );
}
