import { useI18n } from '../../i18n/index';
import { aiModels } from '../../assets/aiModels';
import './AIModels.css';

export default function AIModels() {
  const { t } = useI18n();
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
