import { useI18n } from '../../i18n/index';
import { useRef } from 'react';
import { motion, useScroll, useTransform, useReducedMotion } from 'motion/react';
import { ArrowUpRight, ArrowDown, Play } from 'lucide-react';
import { heroMedia } from '../../assets/media';
import useInlineVideo from '../../hooks/useInlineVideo';
import { useAuth } from '../../context/AuthContext';
export default function Hero() {
  const { t } = useI18n();
  const { requestAuth, loading } = useAuth();
  const ref = useRef(null);
  const reduced = useReducedMotion();
  const video = useInlineVideo(heroMedia.video, { group: 'hero', autoplay: !reduced });
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] });
  const y = useTransform(scrollYProgress, [0, 1], [0, reduced ? 0 : 130]);
  return (
    <section className="hero" id="home" ref={ref}>
      <motion.div className="hero-background" style={{ y }}>
        <img
          className="hero-poster"
          src={heroMedia.poster}
          alt=""
          fetchPriority="high"
          width="1600"
          height="1000"
        />
        {!reduced && (
          <video
            ref={video.ref}
            className={video.ready ? 'hero-video ready' : 'hero-video'}
            poster={heroMedia.poster}
            preload="metadata"
            muted
            loop
            playsInline
            aria-hidden="true"
          />
        )}
      </motion.div>
      <div className="hero-overlay" />

      <motion.div
        className="hero-content"
        initial={{ opacity: 0, y: 28 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="hero-label">{t('ИЗ ВООБРАЖЕНИЯ — В РЕАЛЬНОСТЬ')}</div>
        <h1>
          {t('СОЗДАВАЙ ВИДЕО,')}
          <br />
          {t('КОТОРЫЕ СТАНОВЯТСЯ')}
          <br />
          <span>{t('ТРЕНДАМИ.')}</span>
        </h1>
        <p>
          {t('Превращай идеи, фотографии и текст в невероятные')}
          <br className="desktop-break" />
          {t(' видео с помощью искусственного интеллекта.')}
        </p>
        <div className="hero-buttons">
          <button
            className="glass-button primary"
            disabled={loading}
            onClick={() => requestAuth('login', '/workflow')}
          >
            {t('Начать создавать')}
            <ArrowUpRight size={19} />
          </button>
          <a className="glass-button" href="#showcase">
            <Play size={15} />
            {t('Смотреть примеры')}
          </a>
        </div>
      </motion.div>
      <div className="hero-bottom">
        {video.blocked && (
          <button className="glass-button compact hero-video-start" onClick={video.play}>
            <Play size={14} />
            {t(' Включить фоновое видео')}
          </button>
        )}
        <a href="#showcase" className="scroll-indicator">
          <ArrowDown size={18} />
          <span>{t('ЛИСТАЙ. ВДОХНОВЛЯЙСЯ.')}</span>
        </a>
        <span className="hero-caption">
          <span>{t('Одна платформа. Твоё воображение.')}</span>
        </span>
        <span className="edition">01 — ∞</span>
      </div>
    </section>
  );
}
