import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { createGlassScene } from './glassScene';
import { createMediaGlassRenderer } from './mediaGlassRenderer';

export default function HeaderMediaGlass() {
  const ref = useRef(null);
  const { pathname } = useLocation();
  useEffect(() => {
    const canvas = ref.current,
      renderer = createMediaGlassRenderer(canvas),
      painter = createGlassScene();
    if (!renderer || !painter) return;
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    let timer,
      disposed = false,
      painting = false,
      pendingPaint = false,
      lastPaint = 0;
    async function draw() {
      clearTimeout(timer);
      if (disposed || document.hidden) return;
      if (painting) {
        pendingPaint = true;
        return;
      }
      const now = performance.now();
      if (now - lastPaint < 50) {
        timer = setTimeout(draw, 50 - (now - lastPaint));
        return;
      }
      lastPaint = now;
      const bounds = canvas.getBoundingClientRect();
      if (!bounds.width || !bounds.height) return;
      painting = true;
      try {
        const scene = painter.paint(bounds);
        const strength =
          canvas.dataset.strength === undefined ? 1 : Number(canvas.dataset.strength);
        const drawn = await renderer.draw(scene, bounds, strength);
        if (disposed) return;
        canvas.dataset.active = drawn ? 'true' : 'false';
        delete canvas.dataset.error;
        canvas.dataset.elements = String(scene.elements);
        // Native glass follows external video directly; no repeated pixel pass
        // is needed until scrolling, resizing or a media/DOM change requests one.
        if (scene.moving && !scene.unreadableMedia && !motion.matches) timer = setTimeout(draw, 50);
      } catch (error) {
        if (disposed) return;
        canvas.dataset.active = 'false';
        canvas.dataset.error = error.name;
      } finally {
        painting = false;
        if (pendingPaint && !disposed) {
          pendingPaint = false;
          requestPaint();
        }
      }
    }
    function requestPaint() {
      if (disposed) return;
      if (painting) {
        pendingPaint = true;
        return;
      }
      clearTimeout(timer);
      timer = setTimeout(draw, Math.max(0, 50 - (performance.now() - lastPaint)));
    }
    const observer = new MutationObserver(requestPaint);
    for (const root of document.querySelectorAll('#main, #root > footer')) {
      observer.observe(root, {
        childList: true,
        subtree: true,
        attributes: true,
        characterData: true,
      });
    }
    const resized = new ResizeObserver(requestPaint);
    resized.observe(canvas);
    window.addEventListener('scroll', requestPaint, { passive: true });
    window.addEventListener('resize', requestPaint, { passive: true });
    document.addEventListener('visibilitychange', requestPaint);
    document.addEventListener('load', requestPaint, true);
    document.addEventListener('playing', requestPaint, true);
    document.addEventListener('input', requestPaint, true);
    motion.addEventListener('change', requestPaint);
    document.fonts?.ready.then(requestPaint);
    requestPaint();
    return () => {
      disposed = true;
      clearTimeout(timer);
      observer.disconnect();
      resized.disconnect();
      window.removeEventListener('scroll', requestPaint);
      window.removeEventListener('resize', requestPaint);
      document.removeEventListener('visibilitychange', requestPaint);
      document.removeEventListener('load', requestPaint, true);
      document.removeEventListener('playing', requestPaint, true);
      document.removeEventListener('input', requestPaint, true);
      motion.removeEventListener('change', requestPaint);
      renderer.dispose();
      canvas.dataset.active = 'false';
    };
  }, [pathname]);
  return <canvas ref={ref} className="header-glass-media" data-active="false" />;
}
