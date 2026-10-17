import { useI18n } from '../../i18n/index';
import PlanCards from './PlanCards';

export default function Pricing() {
  const { t } = useI18n();
  return (
    <section className="pricing section container" id="pricing">
      <div className="section-heading">
        <div>
          <h2>
            {t('ВЫБЕРИ СВОЙ УРОВЕНЬ')}
            <br />
            <span className="dim">{t('ТВОРЧЕСТВА.')}</span>
          </h2>
        </div>
        <p>
          {t('Твой ритм. Твои возможности.')}
          <br />
          {t('Твой следующий большой проект.')}
        </p>
      </div>
      <PlanCards />
    </section>
  );
}
