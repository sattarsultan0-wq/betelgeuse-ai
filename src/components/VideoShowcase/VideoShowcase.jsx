import { useState } from 'react';
import { LoaderCircle } from 'lucide-react';
import useTrends from '../../hooks/useTrends';
import VideoModal from './VideoModal';
import VideoCard from './VideoCard';

export default function VideoShowcase() {
  const [selected, setSelected] = useState(null);
  const { items, loading, error, reload } = useTrends();
  return (
    <section className="showcase section" id="showcase">
      <div className="section-heading container">
        <div>
          <h2>
            ВДОХНОВЛЯЙСЯ.
            <br />
            СОЗДАВАЙ. <span className="dim">УДИВЛЯЙ.</span>
          </h2>
        </div>
        <p className="showcase-note container">
            Нажми на тренд, добавь фотографии и создай свою версию.
        </p>
      </div>
      {loading && !items.length && (
        <div className="empty-state container" role="status">
          <LoaderCircle className="spin" />
          <p>Загружаем примеры…</p>
        </div>
      )}
      {error && (
        <div className="empty-state container">
          <p className="error" role="alert">
            {error}
          </p>
          <button className="glass-button compact" onClick={reload} disabled={loading}>
            Повторить загрузку
          </button>
        </div>
      )}
      {!loading && !error && !items.length && (
        <p className="showcase-note container">Новые примеры скоро появятся.</p>
      )}
      {items.length > 0 && (
        <div className="showcase-rows">
          {[0, 1, 2].map((row) => {
            const rowItems = items.slice(row * 2).concat(items.slice(0, row * 2));
            return (
              <div className={`marquee row-${row}`} key={row}>
                <div className="marquee-track">
                  {[0, 1].map((copy) => (
                    <div
                      className="marquee-group"
                      key={copy}
                      aria-hidden={copy === 1 ? true : undefined}
                    >
                      {rowItems.map((item) => (
                        <VideoCard
                          key={item.id}
                          item={item}
                          onSelect={setSelected}
                          duplicate={copy === 1}
                          index={items.indexOf(item)}
                        />
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
      <VideoModal item={selected} onClose={() => setSelected(null)} />
    </section>
  );
}
