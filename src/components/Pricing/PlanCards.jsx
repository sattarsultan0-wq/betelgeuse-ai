import { useI18n } from '../../i18n/index';
import { useEffect, useState } from 'react';
import { ArrowUpRight, Check } from 'lucide-react';
import { plans } from '../../assets/plans';
import Modal from '../UI/Modal';
import { api } from '../../services/api';

export default function PlanCards({ workspace = false }) {
  const { t, locale } = useI18n();
  const [selected, setSelected] = useState(null);
  const [offerings, setOfferings] = useState([]);
  const [error, setError] = useState('');
  useEffect(() => {
    const controller = new AbortController();
    api('/pricing/plans', { signal: controller.signal })
      .then(({ plans }) => setOfferings(plans))
      .catch((err) => {
        if (err.name !== 'AbortError') setError(err.message);
      });
    return () => controller.abort();
  }, []);
  const prefix = workspace ? 'wf-' : '';
  return (
    <>
      <div className={`${prefix}plans`}>
        {plans.map((presentation) => {
          const plan = {
            ...presentation,
            ...offerings.find((offer) => offer.id === presentation.id),
          };
          return (
            <article
              className={`${prefix}plan glass ${plan.featured ? 'featured' : ''}`}
              key={plan.id}
            >
              {plan.featured && (
                <span className={`${prefix}plan-label`}>{t('ДЛЯ СОЗДАТЕЛЕЙ')}</span>
              )}
              <span className={`${prefix}plan-name`}>{plan.name}</span>
              <p>{t(plan.caption)}</p>
              <div className={`${prefix}plan-price`}>
                {plan.monthlyPriceKZT != null
                  ? `${plan.monthlyPriceKZT.toLocaleString(locale)} ₸`
                  : t('Скоро')}
                <small>{t(plan.monthlyPriceKZT != null ? 'в месяц' : 'Условия готовятся')}</small>
              </div>
              <ul>
                {plan.discountPercent != null && (
                  <li>
                    <Check size={15} />
                    {t('Скидка {{percent}}% на генерации', { percent: plan.discountPercent })}
                  </li>
                )}
                {plan.features.map((feature) => (
                  <li key={feature}>
                    <Check size={15} />
                    {t(feature)}
                  </li>
                ))}
              </ul>
              <button
                className={`glass-button ${plan.featured ? 'primary' : ''}`}
                onClick={() => setSelected(plan)}
              >
                {t(plan.cta)}
                <ArrowUpRight size={17} />
              </button>
            </article>
          );
        })}
      </div>
      <p className={`${prefix}pricing-note`}>{t('Платежи пока не подключены.')}</p>
      {error && <p role="alert">{t(error)}</p>}
      <Modal
        open={!!selected}
        title={t('{{v0}} — скоро', { v0: selected?.name })}
        onClose={() => setSelected(null)}
        className={workspace ? 'wf-dialog' : ''}
      >
        <p className="muted">
          {t('Покупка подписки пока недоступна. Скидка применяется к активной подписке аккаунта.')}
        </p>
        <button className="glass-button" onClick={() => setSelected(null)}>
          {t('Понятно')}
          <Check size={17} />
        </button>
      </Modal>
    </>
  );
}
