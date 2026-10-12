import { useEffect, useRef, useState } from 'react';
import { ArrowUpRight, Play, X } from 'lucide-react';
import { showcases } from '../../assets/showcase';
import Modal from '../UI/Modal';
function Card({ item, onSelect, duplicate }) {
  const ref = useRef(null);
  useEffect(() => {
    if (!item.video || !ref.current) return;
    const video = ref.current;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !document.hidden) video.play().catch(() => {});
        else video.pause();
      },
      { rootMargin: '50px' },
    );
    observer.observe(video);
    const visibility = () => {
      if (document.hidden) video.pause();
    };
    document.addEventListener('visibilitychange', visibility);
    return () => {
      observer.disconnect();
      document.removeEventListener('visibilitychange', visibility);
    };
  }, [item.video]);
  return (
    <button
      className="showcase-card"
      tabIndex={duplicate ? -1 : 0}
      onClick={() => onSelect(item)}
      aria-label={`Открыть концепт: ${item.title}`}
    >
      <img src={item.poster} alt="" loading="lazy" width="720" height="450" />
      {item.video && (
        <video
          ref={ref}
          src={item.video}
          muted
          loop
          playsInline
          preload="none"
          poster={item.poster}
        />
      )}
      <span className="card-badge">CONCEPT / 0{showcases.indexOf(item) + 1}</span>
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
          const items = showcases.slice(row * 2).concat(showcases.slice(0, row * 2));
          return (
            <div className={`marquee row-${row}`} key={row}>
              <div className="marquee-track">
                {[0, 1].map((copy) => (
                  <div
                    className="marquee-group"
                    key={copy}
                    aria-hidden={copy === 1 ? true : undefined}
                  >
                    {items.map((item) => (
                      <Card
                        key={item.id}
                        item={item}
                        onSelect={setSelected}
                        duplicate={copy === 1}
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
        Авторские визуальные концепты. Галерея AI-видео появится после первых генераций.
      </p>
      <Modal open={!!selected} title={selected?.title || ''} onClose={() => setSelected(null)}>
        {selected && <img className="concept-preview" src={selected.poster} alt={selected.title} />}
        <p className="muted">{selected?.prompt}</p>
        <button
          className="glass-button primary"
          onClick={() => {
            window.dispatchEvent(new CustomEvent('betelgeuse:prompt', { detail: selected.prompt }));
            setSelected(null);
            document.getElementById('generator')?.scrollIntoView({ behavior: 'smooth' });
          }}
        >
          Использовать идею
          <ArrowUpRight size={18} />
        </button>
      </Modal>
    </section>
  );
}
