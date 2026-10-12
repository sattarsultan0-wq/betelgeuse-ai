import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { createMediaGlassRenderer } from './mediaGlassRenderer';

export default function HeaderMediaGlass() {
  const ref = useRef(null);
  const [contextVersion, setContextVersion] = useState(0);
  const { pathname } = useLocation();
  useEffect(() => {
    const canvas = ref.current,
      hero = document.getElementById('home');
    if (!hero) return;
    const renderer = createMediaGlassRenderer(canvas);
    if (!renderer) return;
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    let timer,
      visible = false,
      failed = false,
      lastPaint = 0;
    function draw() {
      clearTimeout(timer);
      if (failed || !visible || document.hidden) {
        canvas.dataset.active = 'false';
        return;
      }
      const now = performance.now();
      if (now - lastPaint < 50) {
        timer = setTimeout(draw, 50 - (now - lastPaint));
        return;
      }
      lastPaint = now;
      const bounds = canvas.getBoundingClientRect(),
        heroBounds = hero.getBoundingClientRect();
      // Do not paint Hero pixels over other sections or over foreground Hero text.
      const textBounds = hero.querySelector('.hero-content')?.getBoundingClientRect();
      if (heroBounds.bottom < bounds.bottom || (textBounds && textBounds.top < bounds.bottom)) {
        canvas.dataset.active = 'false';
        timer = setTimeout(draw, 120);
        return;
      }
      const video = hero.querySelector('.hero-video.ready');
      const source =
        !motion.matches && video?.readyState >= 2 ? video : hero.querySelector('.hero-poster');
      try {
        canvas.dataset.active =
          source && renderer.draw(source, bounds, hero.querySelector('.hero-overlay'))
            ? 'true'
            : 'false';
      } catch {
        // Cross-origin media without CORS, WebGL failures, etc. preserve CSS glass.
        canvas.dataset.active = 'false';
        failed = true;
      }
      if (!motion.matches && !failed) timer = setTimeout(draw, video && !video.paused ? 50 : 150);
    }
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      draw();
    });
    observer.observe(hero);
    document.addEventListener('visibilitychange', draw);
    window.addEventListener('scroll', draw, { passive: true });
    window.addEventListener('resize', draw, { passive: true });
    motion.addEventListener('change', draw);
    const loaded = () => draw();
    hero.addEventListener('load', loaded, true);
    hero.addEventListener('playing', loaded, true);
    const lost = (event) => {
      event.preventDefault();
      failed = true;
      clearTimeout(timer);
      canvas.dataset.active = 'false';
    };
    canvas.addEventListener('webglcontextlost', lost);
    const restored = () => setContextVersion((version) => version + 1);
    canvas.addEventListener('webglcontextrestored', restored);
    return () => {
      clearTimeout(timer);
      observer.disconnect();
      document.removeEventListener('visibilitychange', draw);
      window.removeEventListener('scroll', draw);
      window.removeEventListener('resize', draw);
      motion.removeEventListener('change', draw);
      hero.removeEventListener('load', loaded, true);
      hero.removeEventListener('playing', loaded, true);
      canvas.removeEventListener('webglcontextlost', lost);
      canvas.removeEventListener('webglcontextrestored', restored);
      canvas.dataset.active = 'false';
      renderer.dispose();
    };
  }, [pathname, contextVersion]);
  return <canvas ref={ref} className="header-glass-media" data-active="false" />;
}
