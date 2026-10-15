import { aiModels } from '../../assets/aiModels';
import './AIModels.css';

export default function AIModels() {
  return (
    <section className="home-models" aria-labelledby="home-models-title">
      <div className="home-models-heading container">
        <div>
          <h2 id="home-models-title">Ведущие AI-модели в одном месте</h2>
          <p>Модели и технологии нашей платформы. Доступность — в рабочем пространстве.</p>
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
                  <img className={'model-logo'} src={model.mark}/>
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
