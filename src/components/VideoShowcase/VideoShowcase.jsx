import { useEffect, useState } from 'react';
import { ArrowUpRight, Play } from 'lucide-react';
import { showcases } from '../../assets/showcase';
import TrendDialog from './TrendDialog';
import { api } from '../../services/api';
import useInlineVideo from '../../hooks/useInlineVideo';
function Card({ item, onSelect, duplicate, index }) {
  const video = useInlineVideo(item.src);
  return (
    <button
      className="showcase-card"
      tabIndex={duplicate ? -1 : 0}
      onClick={() => onSelect(item)}
      aria-label={`Открыть ${item.src ? 'видео' : 'концепт'}: ${item.title}`}
    >
      {item.poster && <img src={item.poster} alt="" loading="lazy" width="720" height="450" />}
      {item.src && (
        <video
          ref={video.ref}
          className={video.ready && !video.failed ? 'ready' : ''}
          data-video-state={
            video.failed ? 'failed' : video.blocked ? 'blocked' : video.ready ? 'ready' : 'idle'
          }
          muted
          loop
          playsInline
          preload="none"
          poster={item.poster}
        />
      )}
      <span className="card-badge">TREND / {String(index + 1).padStart(2, '0')}</span>
      <span className="card-play">
        <Play size={15} />
      </span>
      <span className="card-caption">
        <span>
          {item.title}
          <small>{item.model}</small>
        </span>
        <ArrowUpRight size={18} />
      </span>
    </button>
  );
}

export default function VideoShowcase() {
  const [selected, setSelected] = useState(null);
  const [items, setItems] = useState(showcases);
  useEffect(() => {
    const controller = new AbortController();
    api('/trends', { signal: controller.signal })
      .then(({ trends }) => {
        setItems(
          trends.map((trend) => {
            const local = showcases.find((item) => (item.trendId || item.id) === trend.id);
            return {
              ...local,
              ...trend,
              id: local?.id || trend.id,
              trendId: trend.id,
              title: local?.title || trend.title,
              src: local?.src || trend.videoUrl,
            };
          }),
        );
      })
      .catch(() => {});
    return () => controller.abort();
  }, []);
  return (
    <section className="showcase section" id="showcase">
      <div className="section-heading container">
        <div>
          <span className="eyebrow">01 / ВОЗМОЖНОСТИ БЕЗ ГРАНИЦ</span>
          <h2>
            ВДОХНОВЛЯЙСЯ.
            <br />
            СОЗДАВАЙ. <span className="dim">УДИВЛЯЙ.</span>
          </h2>
        </div>
        <p>
          От первого кадра до новой вселенной.
          <br />
          Всё начинается с твоей идеи.
        </p>
      </div>
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
                      <Card
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
      <p className="showcase-note container">
        Нажми на тренд, добавь фотографии и создай свою версию.
      </p>
      {selected && (
        <TrendDialog
          key={selected.trendId || selected.id}
          item={selected}
          onClose={() => setSelected(null)}
        />
      )}
    </section>
  );
}
