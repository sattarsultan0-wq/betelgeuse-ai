import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { LoaderCircle, Shield } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import Generator from '../components/Generator/Generator';

export default function Admin() {
  const { user, loading, setDialog } = useAuth();
  const [status, setStatus] = useState(null),
    [error, setError] = useState('');
  useEffect(() => {
    setStatus(null);
    setError('');
    if (!user?.isAdmin) return;
    const controller = new AbortController();
    api('/admin/status', { signal: controller.signal })
      .then(setStatus)
      .catch((err) => {
        if (err.name !== 'AbortError') setError(err.message);
      });
    return () => controller.abort();
  }, [user?.id, user?.isAdmin]);
  if (loading)
    return (
      <section className="subpage container">
        <LoaderCircle className="spin" />
      </section>
    );
  if (!user)
    return (
      <section className="subpage container">
        <h1>АДМИНКА</h1>
        <button className="glass-button" onClick={() => setDialog('login')}>
          Войти
        </button>
      </section>
    );
  if (!user.isAdmin)
    return (
      <section className="subpage container">
        <h1>Доступ ограничен</h1>
        <p>Эта страница доступна администратору.</p>
        <Link to="/" className="glass-button">
          На главную
        </Link>
      </section>
    );
  return (
    <>
      <section className="subpage container admin-page">
        <span className="eyebrow">
          <Shield size={16} /> ДОСТУП АДМИНИСТРАТОРА
        </span>
        <h1>СТУДИЯ SULTAN</h1>
        <p className="muted">
          Генерации без списания кредитов Betelgeuse. Higgsfield оплачивается с баланса вашего
          API-аккаунта.
        </p>
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        {status && (
          <div className="admin-status-grid">
            <article className="glass">
              <h2>Higgsfield</h2>
              <p>{status.providerConfigured ? 'API подключён' : 'API ещё не настроен'}</p>
            </article>
            <article className="glass">
              <h2>Cloudflare R2</h2>
              <p>
                {status.storageConfigured ? 'Хранилище настроено' : 'Хранилище ещё не настроено'}
              </p>
            </article>
            <article className="glass">
              <h2>Кредиты</h2>
              <p>Не списываются</p>
              <small>Лимиты одновременных задач сохраняются.</small>
            </article>
          </div>
        )}
        <div className="trend-actions">
          <Link className="glass-button" to="/#showcase">
            Создать по тренду
          </Link>
          <Link className="glass-button" to="/library">
            История генераций
          </Link>
        </div>
      </section>
      {status && <Generator />}
    </>
  );
}
