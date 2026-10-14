import { ArrowUpRight, Play, Sparkles } from 'lucide-react';
import { useReducedMotion } from 'motion/react';
import { useAuth } from '../../context/AuthContext';
import { workflowMedia } from '../../assets/media';
import useInlineVideo from '../../hooks/useInlineVideo';
import './CreateCTA.css';

export default function CreateCTA() {
  const { requestAuth, loading } = useAuth();
  const reduced = useReducedMotion();
  const video = useInlineVideo(workflowMedia.video, { group: 'preview', autoplay: !reduced });
  return (
    <section
      className="home-create section container"
      id="generator"
      aria-labelledby="home-create-title"
    >
      <div className="home-create-copy">
        <span className="eyebrow">02 / ОТ ИДЕИ ДО ПЕРВОГО КАДРА</span>
        <h2 id="home-create-title">
          Воплощай идеи
          <br />
          <span className="dim">в реальность</span>
        </h2>
        <p>
          Текст становится сценой. Фотография оживает. Собирай идеи, исследуй возможности AI и
          создавай свою вселенную в одном рабочем пространстве.
        </p>
        <button
          className="glass-button primary home-create-button"
          disabled={loading}
          onClick={() => requestAuth('login', '/workflow')}
        >
          Начать создавать <ArrowUpRight size={20} />
        </button>
        <div className="home-create-caption">
          <Sparkles size={14} /> Твоё воображение. Новая орбита возможностей.
        </div>
      </div>
      <div className="home-create-preview">
        <div className="home-create-preview-top">
          <span className="live-dot" /> BETELGEUSE / CREATIVE WORKSPACE <span>01 — ∞</span>
        </div>
        <div className="home-create-video">
          {workflowMedia.video && !video.failed ? (
            <>
              <video
                ref={video.ref}
                poster={workflowMedia.poster || undefined}
                autoPlay={!reduced}
                muted
                loop
                playsInline
                preload="none"
                aria-label="Демонстрация рабочего пространства Betelgeuse"
              />
              {(video.blocked || reduced) && (
                <button className="glass-button compact home-create-play" onClick={video.play}>
                  <Play size={15} /> Смотреть демо
                </button>
              )}
            </>
          ) : (
            <div className="home-create-video-empty">
              <div className="home-create-orbit">
                <Sparkles size={36} />
              </div>
              <span>ТВОЯ СЛЕДУЮЩАЯ БОЛЬШАЯ ИДЕЯ</span>
              <small>Место для демонстрационного видео</small>
            </div>
          )}
        </div>
        <div className="home-create-preview-bottom">
          <span>Из воображения — в реальность</span>
          <span>✦</span>
        </div>
      </div>
    </section>
  );
}
