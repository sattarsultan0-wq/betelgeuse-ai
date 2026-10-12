import { useEffect, useRef, useState } from 'react';
import { registerPlayback, updatePlayback } from '../services/videoPlayback';

export default function useInlineVideo(src, { group = 'preview', autoplay = true } = {}) {
  const ref = useRef(null),
    entryRef = useRef(null);
  const [state, setState] = useState({ ready: false, blocked: false, failed: false });
  useEffect(() => {
    const video = ref.current;
    if (!video || !src) return;
    let disposed = false;
    setState({ ready: false, blocked: false, failed: false });
    video.muted = true;
    video.defaultMuted = true;
    video.setAttribute('muted', '');
    video.setAttribute('playsinline', '');
    video.setAttribute('webkit-playsinline', '');
    const entry = {
      video,
      group,
      autoplay,
      visible: false,
      ratio: 0,
      active: false,
      blocked: false,
      failed: false,
      requested: false,
      play() {
        if (video.getAttribute('src') !== src) video.src = src;
        video.muted = true;
        video.play()?.catch((error) => {
          if (disposed || !entry.active || error.name === 'AbortError') return;
          if (error.name === 'NotAllowedError') {
            entry.blocked = true;
            setState((current) => ({ ...current, blocked: true }));
          } else {
            entry.failed = true;
            setState((current) => ({ ...current, failed: true }));
          }
          updatePlayback();
        });
      },
    };
    entryRef.current = entry;
    const playing = () => setState({ ready: true, blocked: false, failed: false });
    const error = () => {
      entry.failed = true;
      setState((current) => ({ ...current, ready: false, failed: true }));
      updatePlayback();
    };
    video.addEventListener('playing', playing);
    video.addEventListener('error', error);
    const unregister = registerPlayback(entry);
    const observer = new IntersectionObserver(
      ([event]) => {
        entry.visible = event.isIntersecting && event.intersectionRatio > 0;
        entry.ratio = event.intersectionRatio;
        updatePlayback();
      },
      { threshold: [0, 0.15, 0.5, 0.85, 1] },
    );
    observer.observe(video);
    return () => {
      disposed = true;
      observer.disconnect();
      video.removeEventListener('playing', playing);
      video.removeEventListener('error', error);
      unregister();
      entryRef.current = null;
    };
  }, [src, group, autoplay]);

  function play() {
    const entry = entryRef.current;
    if (!entry) return;
    entry.blocked = false;
    entry.requested = true;
    entry.active = true;
    entry.play();
  }
  return { ref, ...state, play };
}
