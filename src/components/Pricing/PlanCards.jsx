import { useState } from 'react';
import { ArrowUpRight, Check } from 'lucide-react';
import { plans } from '../../assets/plans';
import Modal from '../UI/Modal';

export default function PlanCards({ workspace = false }) {
  const [selected, setSelected] = useState(null);
  const prefix = workspace ? 'wf-' : '';
  return (
    <>
      <div className={`${prefix}plans`}>
        {plans.map((plan) => (
          <article
            className={`${prefix}plan glass ${plan.featured ? 'featured' : ''}`}
            key={plan.id}
          >
            {plan.featured && <span className={`${prefix}plan-label`}>ДЛЯ СОЗДАТЕЛЕЙ</span>}
            <span className={`${prefix}plan-name`}>{plan.name}</span>
            <p>{plan.caption}</p>
            <div className={`${prefix}plan-price`}>
              {plan.price ?? 'Скоро'}
              <small>{plan.price != null ? 'в месяц' : 'Условия готовятся'}</small>
            </div>
            <ul>
              {plan.features.map((feature) => (
                <li key={feature}>
                  <Check size={15} />
                  {feature}
                </li>
              ))}
            </ul>
            <button
              className={`glass-button ${plan.featured ? 'primary' : ''}`}
              onClick={() => setSelected(plan)}
            >
              {plan.cta}
              <ArrowUpRight size={17} />
            </button>
          </article>
        ))}
      </div>
      <p className={`${prefix}pricing-note`}>
        Цены и лимиты будут объявлены перед запуском. Платежи пока не подключены.
      </p>
      <Modal
        open={!!selected}
        title={`${selected?.name} — скоро`}
        onClose={() => setSelected(null)}
        className={workspace ? 'wf-dialog' : ''}
      >
        <p className="muted">
          Мы готовим условия этого тарифа. Сейчас подписка и оплата недоступны. Доступ к генерациям
          выдаётся администратором.
        </p>
        <button className="glass-button" onClick={() => setSelected(null)}>
          Понятно
          <Check size={17} />
        </button>
      </Modal>
    </>
  );
}
