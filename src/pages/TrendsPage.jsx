import { useState } from 'react';
import { Flame, RotateCcw } from 'lucide-react';
import useTrends, { remoteTrend } from '../hooks/useTrends';
import VideoCard from '../components/VideoShowcase/VideoCard';
import VideoModal from '../components/VideoShowcase/VideoModal';
import '../styles/trends.css';

export default function TrendsPage() {
  const { items, loading, error, reload } = useTrends();
  const [selected, setSelected] = useState(null);
  const videos = items.filter(remoteTrend);
  return (
    <section className="wf-page trends-page">
      <header className="wf-page-heading trends-heading">
        <span className="eyebrow">
          <Flame size={13} /> НАЙДИ СВОЮ ИСКРУ
        </span>
        <h1>
          Тренды<span className="dim">.</span>
        </h1>
        <p>Исследуй популярные AI-видео и вдохновляйся новыми идеями</p>
      </header>
      {error && (
        <div className="trends-error" role="alert">
          <p>{error}</p>
          <button className="glass-button compact" disabled={loading} onClick={reload}>
            <RotateCcw size={14} />
            Повторить загрузку
          </button>
        </div>
      )}
      {loading && !videos.length ? (
        <div
          className="trends-grid trends-skeleton-grid"
          role="status"
          aria-label="Загружаем тренды"
        >
          <span className="sr-only">Загружаем тренды…</span>
          {Array.from({ length: 8 }, (_, index) => (
            <div className="trends-skeleton" key={index}>
              <span />
              <span />
            </div>
          ))}
        </div>
      ) : videos.length ? (
        <>
          <div className="trends-gallery-meta">
            <span>{videos.length} видео для вдохновения</span>
            <span>Выбери сюжет. Создай свою версию.</span>
          </div>
          <div className="trends-grid" aria-label="Галерея трендов" aria-busy={loading}>
            {videos.map((item, index) => (
              <VideoCard key={item.id} item={item} index={index} gallery onSelect={setSelected} />
            ))}
          </div>
        </>
      ) : (
        !error && (
          <div className="trends-empty">
            <span className="trends-empty-symbol">
              <Flame size={30} />
            </span>
            <h2>Новая волна уже близко</h2>
            <p>
              Здесь появятся популярные AI-видео.
              <br />
              Загляни позже за новой порцией вдохновения.
            </p>
            <button className="glass-button compact" onClick={reload}>
              <RotateCcw size={14} />
              Обновить
            </button>
          </div>
        )
      )}
      <VideoModal item={selected} onClose={() => setSelected(null)} />
    </section>
  );
}
