import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, LoaderCircle, Film, Download } from 'lucide-react';
import { api, downloadVideo } from '../services/api';
import { useAuth } from '../context/AuthContext';
const labels = {
  queued: 'В очереди',
  processing: 'Создаётся',
  completed: 'Готово',
  failed: 'Ошибка',
};
export default function Library() {
  const { user, loading, setDialog } = useAuth();
  const [items, setItems] = useState([]),
    [error, setError] = useState(''),
    [fetching, setFetching] = useState(true),
    [page, setPage] = useState(1),
    [total, setTotal] = useState(0);
  useEffect(() => {
    if (!user) return;
    let timer,
      stopped = false;
    const controller = new AbortController();
    setFetching(true);
    setItems([]);
    async function load() {
      try {
        const data = await api(`/users/me/generations?page=${page}`, { signal: controller.signal });
        if (stopped) return;
        setItems(data.generations);
        setTotal(data.total);
        setError('');
        if (data.generations.some((item) => ['queued', 'processing'].includes(item.status)))
          timer = setTimeout(load, 5000);
      } catch (err) {
        if (!stopped) setError(err.message);
      } finally {
        if (!stopped) setFetching(false);
      }
    }
    load();
    return () => {
      stopped = true;
      clearTimeout(timer);
      controller.abort();
    };
  }, [user?.id, page]);
  return (
    <section className="subpage container">
      <span className="eyebrow">ТВОЁ ТВОРЧЕСКОЕ ПРОСТРАНСТВО</span>
      <h1>МОЯ БИБЛИОТЕКА</h1>
      {loading ? (
        <LoaderCircle className="spin" />
      ) : !user ? (
        <div className="empty-state glass">
          <Film size={36} />
          <p>Войди, чтобы увидеть свои генерации.</p>
          <button className="glass-button" onClick={() => setDialog('login')}>
            Войти
            <ArrowUpRight size={18} />
          </button>
        </div>
      ) : (
        <>
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
          <div className="library-meta">
            <span className="muted">Доступная квота: {user.generationCredits} ед.</span>
            <Link className="glass-button compact" to="/#generator">
              Создать видео
              <ArrowUpRight size={16} />
            </Link>
          </div>
          {fetching ? (
            <LoaderCircle className="spin" />
          ) : !items.length ? (
            <div className="empty-state glass">
              <Film size={36} />
              <p>Здесь начнётся твоя история.</p>
              <Link className="glass-button" to="/#generator">
                Создать первое видео
                <ArrowUpRight size={18} />
              </Link>
            </div>
          ) : (
            <div className="library-grid">
              {items.map((item) => (
                <article key={item.id} className="library-card glass">
                  {item.resultVideoUrl ? (
                    <video src={item.resultVideoUrl} controls playsInline preload="metadata" />
                  ) : (
                    <div className="library-placeholder">
                      <Film size={30} />
                      <span>{labels[item.status]}</span>
                    </div>
                  )}
                  <p>{item.prompt}</p>
                  <div>
                    <small>
                      {new Date(item.createdAt).toLocaleDateString('ru-RU')} · {item.duration} сек ·{' '}
                      {item.quality}
                    </small>
                    {item.resultVideoUrl && (
                      <button
                        className="icon-button"
                        aria-label="Скачать видео"
                        onClick={() => downloadVideo(item.id).catch((err) => setError(err.message))}
                      >
                        <Download size={16} />
                      </button>
                    )}
                  </div>
                  {item.errorMessage && <p className="error">{item.errorMessage}</p>}
                </article>
              ))}
            </div>
          )}
          {total > 20 && (
            <div className="pagination">
              <button
                className="glass-button compact"
                disabled={page === 1}
                onClick={() => setPage(page - 1)}
              >
                Назад
              </button>
              <span>
                {page} / {Math.ceil(total / 20)}
              </span>
              <button
                className="glass-button compact"
                disabled={page * 20 >= total}
                onClick={() => setPage(page + 1)}
              >
                Далее
              </button>
            </div>
          )}
        </>
      )}
    </section>
  );
}
