import { useState } from 'react';
import { AlertCircle, ArrowUpRight, Film, Play } from 'lucide-react';
import useInlineVideo from '../../hooks/useInlineVideo';
import './VideoCard.css';

export default function VideoCard({
  item,
  onSelect,
  duplicate = false,
  index = 0,
  gallery = false,
}) {
  const video = useInlineVideo(item.previewUrl || item.src, { autoplay: !gallery });
  const [posterError, setPosterError] = useState(false),
    [ratio, setRatio] = useState(item.mediaAspectRatio || '9 / 16');
  function preview(event) {
    if (
      !gallery ||
      event.pointerType === 'touch' ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    )
      return;
    video.play();
  }
  return (
    <button
      className={`showcase-card ${gallery ? 'showcase-card-grid' : ''}`}
      style={gallery ? { '--trend-media-ratio': ratio } : undefined}
      tabIndex={duplicate ? -1 : 0}
      onClick={() => {
        if (gallery) video.pause({ release: true });
        onSelect(item);
      }}
      onPointerEnter={preview}
      onFocus={preview}
      onPointerLeave={() => {
        if (gallery) video.pause({ release: true });
      }}
      onBlur={() => {
        if (gallery) video.pause({ release: true });
      }}
      aria-label={`Открыть видео: ${item.title}`}
    >
      {item.poster && !posterError ? (
        <img
          src={item.poster}
          alt=""
          loading="lazy"
          decoding="async"
          onError={() => setPosterError(true)}
        />
      ) : (
        <span className="showcase-card-placeholder">
          <Film size={30} />
        </span>
      )}
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
          poster={!posterError ? item.poster : undefined}
          onLoadedMetadata={(event) => {
            const { videoWidth, videoHeight } = event.currentTarget;
            if (videoWidth && videoHeight) setRatio(`${videoWidth} / ${videoHeight}`);
          }}
        />
      )}
      <span className="card-badge">TREND / {String(index + 1).padStart(2, '0')}</span>
      <span className="card-play">
        <Play size={15} />
      </span>
      {video.failed && (
        <span className="showcase-card-media-error">
          <AlertCircle size={13} />
          Превью недоступно. Открыть видео
        </span>
      )}
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
