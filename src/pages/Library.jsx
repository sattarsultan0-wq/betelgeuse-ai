import { useI18n } from '../i18n/index';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, Film, LoaderCircle } from 'lucide-react';
import { api, apiUrl } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { generationLabels } from '../components/Workspace/InteractiveCanvas';
import MediaPreview from '../components/Workspace/MediaPreview';
import MaterialDialog from '../components/Workspace/MaterialDialog';

export default function Library() {
  const { t, locale } = useI18n();
  const { user } = useAuth();
  const [tab, setTab] = useState('video'),
    [items, setItems] = useState([]),
    [page, setPage] = useState(1),
    [total, setTotal] = useState(0),
    [fetching, setFetching] = useState(true),
    [error, setError] = useState(''),
    [material, setMaterial] = useState(null),
    [reload, setReload] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    let timer,
      stopped = false;
    setItems([]);
    setFetching(true);
    setError('');
    async function load() {
      try {
        const data = await api(
          `/users/me/${tab === 'video' ? 'generations' : 'images'}?page=${page}`,
          { signal: controller.signal },
        );
        if (stopped) return;
        const rows =
          tab === 'video'
            ? data.generations
            : data.images.map((image) => ({
                ...image,
                kind: 'image',
                url: apiUrl(`/uploads/${image.id}`),
              }));
        setItems(rows);
        setTotal(data.total);
        setError('');
        if (rows.some((item) => ['queued', 'processing'].includes(item.status)))
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
  }, [user.id, page, tab, reload]);
  return (
    <section className="wf-page wf-library">
      <header className="wf-page-heading">
        <span className="eyebrow">{t('СОХРАНЁННЫЕ МОМЕНТЫ')}</span>
        <h1>
          {t('Твоя библиотека')}
          <span className="dim">.</span>
        </h1>
        <p>{t('Генерации сохраняются автоматически. Исходные фотографии — рядом.')}</p>
      </header>
      <div className="wf-library-toolbar">
        <div className="wf-library-tabs" role="group" aria-label={t('Тип материалов')}>
          {[
            ['video', 'Генерации'],
            ['image', 'Исходные изображения'],
          ].map(([id, label]) => (
            <button
              key={id}
              className={tab === id ? 'active' : ''}
              aria-pressed={tab === id}
              onClick={() => {
                setTab(id);
                setPage(1);
              }}
            >
              {t(label)}
            </button>
          ))}
        </div>
        <Link className="glass-button compact" to="/workflow">
          {t('Создать ')}
          <ArrowUpRight size={16} />
        </Link>
      </div>
      {error && (
        <div className="wf-library-error">
          <p className="wf-error" role="alert">
            {t(error)}
          </p>
          <button className="glass-button compact" onClick={() => setReload((value) => value + 1)}>
            {t('Повторить загрузку')}
          </button>
        </div>
      )}
      {fetching ? (
        <div className="wf-page-loading">
          <LoaderCircle className="spin" />
          <p>{t('Загружаем материалы…')}</p>
        </div>
      ) : !items.length && !error ? (
        <div className="wf-empty-library">
          <Film size={34} />
          <h2>{t('Здесь начнётся твоя история')}</h2>
          <p>
            {t(
              tab === 'image'
                ? 'Загруженные исходные изображения появятся здесь.'
                : 'Создай первое видео — оно автоматически появится в библиотеке.',
            )}
          </p>
          <Link className="glass-button primary" to="/workflow">
            {t('Начать создавать ')}
            <ArrowUpRight size={17} />
          </Link>
        </div>
      ) : (
        <div className="wf-library-grid">
          {items.map((item) => (
            <article className="wf-library-card" key={item.id}>
              {item.kind === 'image' ||
              item.resultVideoUrl ||
              item.resultImageUrl ||
              item.resultImageUrls?.length ? (
                <MediaPreview item={item} onOpen={setMaterial} />
              ) : (
                <div className="wf-library-placeholder">
                  <Film size={27} />
                  {t(generationLabels[item.status])}
                </div>
              )}
              <h2>{item.prompt || item.name}</h2>
              <div className="wf-library-card-meta">
                <small>
                  {t(new Date(item.createdAt).toLocaleDateString(locale))}
                  {t(item.duration ? ` · ${item.duration} сек` : '')}
                </small>
                <small>{t(item.kind === 'image' ? 'Image' : generationLabels[item.status])}</small>
              </div>
              {item.errorMessage && <p className="wf-error">{t(item.errorMessage)}</p>}
            </article>
          ))}
        </div>
      )}
      {total > 20 && (
        <div className="wf-pagination">
          <button
            className="glass-button compact"
            disabled={page === 1}
            onClick={() => setPage(page - 1)}
          >
            {t('Назад')}
          </button>
          <span>
            {t(page)} / {t(Math.ceil(total / 20))}
          </span>
          <button
            className="glass-button compact"
            disabled={page * 20 >= total}
            onClick={() => setPage(page + 1)}
          >
            {t('Далее')}
          </button>
        </div>
      )}
      <MaterialDialog
        key={material?.id || 'closed'}
        item={material}
        onClose={() => setMaterial(null)}
      />
    </section>
  );
}
