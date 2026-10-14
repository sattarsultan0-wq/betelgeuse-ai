import { useState } from 'react';
import { Pause, Play } from 'lucide-react';
import { aiModels } from '../../assets/aiModels';
import './AIModels.css';

export default function AIModels() {
  const [paused, setPaused] = useState(false);
  return (
    <section className="home-models" aria-labelledby="home-models-title">
      <div className="home-models-heading container">
        <div>
          <span className="eyebrow">ТЕХНОЛОГИИ НОВОГО ВООБРАЖЕНИЯ</span>
          <h2 id="home-models-title">Ведущие AI-модели в одном месте</h2>
          <p>Модели и технологии нашей платформы. Доступность — в рабочем пространстве.</p>
        </div>
        <button
          className="icon-button home-models-pause"
          onClick={() => setPaused(!paused)}
          aria-label={paused ? 'Продолжить карусель моделей' : 'Приостановить карусель моделей'}
          aria-pressed={paused}
        >
          {paused ? <Play size={16} /> : <Pause size={16} />}
        </button>
      </div>
      <div className={`home-models-marquee ${paused ? 'is-paused' : ''}`}>
        <div className="home-models-track">
          {[0, 1].map((copy) => (
            <div
              className="home-models-group"
              key={copy}
              aria-hidden={copy === 1 ? true : undefined}
            >
              {aiModels.map((model) => (
                <div className={`home-models-item home-models-item-${model.id}`} key={model.id}>
                  <span className="home-models-mark" aria-hidden="true">
                    {model.mark}
                  </span>
                  <span>{model.name}</span>
                  <span className="home-models-star" aria-hidden="true">
                    ✦
                  </span>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
