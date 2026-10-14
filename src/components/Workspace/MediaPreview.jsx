import { useEffect, useRef, useState } from 'react';
import { Film, Image as ImageIcon, Play } from 'lucide-react';

// Only intersecting cards attach a video source; playback is explicit and muted.
export default function MediaPreview({ item, onOpen }) {
  const ref = useRef(null),
    [visible, setVisible] = useState(false);
  const image = item.kind === 'image' || item.resultImageUrl;
  const src = item.resultImageUrl || item.resultVideoUrl || item.url;
  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), {
      rootMargin: '80px',
    });
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);
  return (
    <button
      ref={ref}
      className="wf-media-preview"
      onClick={() => onOpen(item)}
      aria-label={`Открыть материал: ${item.prompt || item.name || 'Результат генерации'}`}
    >
      {image && src ? (
        <img
          src={src}
          crossOrigin="use-credentials"
          alt={item.name || 'Результат генерации'}
          loading="lazy"
        />
      ) : src ? (
        <>
          <video
            src={visible ? src : undefined}
            muted
            playsInline
            preload={visible ? 'metadata' : 'none'}
          />
          <span className="wf-media-play">
            <Play size={20} />
          </span>
        </>
      ) : (
        <span className="wf-media-placeholder">
          {image ? <ImageIcon size={26} /> : <Film size={26} />}
        </span>
      )}
    </button>
  );
}
