import { useI18n } from '../../i18n/index';
import { aiModels } from '../../assets/aiModels';
import { useEffect, useState } from 'react';
import { api } from '../../services/api';
import { priceLabel } from '../../services/pricing';
import './AIModels.css';

export default function AIModels() {
  const { t } = useI18n();
  const [models, setModels] = useState([]);
  useEffect(() => {
    const controller = new AbortController();
    api('/models', { signal: controller.signal })
      .then((data) => setModels(data.models))
      .catch(() => {});
    return () => controller.abort();
  }, []);
  return (
    <section className="home-models" aria-labelledby="home-models-title">
      <div className="home-models-heading container">
        <div>
          <h2 id="home-models-title">{t('Ведущие AI-модели в одном месте')}</h2>
          <p>{t('Модели и технологии нашей платформы. Доступность — в рабочем пространстве.')}</p>
        </div>
      </div>
      <div className="home-models-marquee">
        <div className="home-models-track">
          {[0, 1].map((copy) => (
            <div
              className="home-models-group"
              key={copy}
              aria-hidden={copy === 1 ? true : undefined}
            >
              {aiModels.map((model) => (
                <div className={`home-models-item home-models-item-${model.id}`} key={model.id}>
                  {model.mark && <img className="model-logo" src={model.mark} alt="" />}
                  <span>
                    {model.name}
                    <small className="home-model-price">
                      {priceLabel(models.find((entry) => entry.id === model.id)?.pricing, t)}
                    </small>
                  </span>
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
