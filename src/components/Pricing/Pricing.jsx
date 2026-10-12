import { useState } from 'react';
import { Check, ArrowUpRight } from 'lucide-react';
import { plans } from '../../assets/plans';
import Modal from '../UI/Modal';
export default function Pricing() {
  const [selected, setSelected] = useState(null);
  return (
    <section className="pricing section container" id="pricing">
      <div className="section-heading">
        <div>
          <span className="eyebrow">03 / БОЛЬШЕ ПРОСТРАНСТВА ДЛЯ ИДЕЙ</span>
          <h2>
            ВЫБЕРИ СВОЙ УРОВЕНЬ
            <br />
            <span className="dim">ТВОРЧЕСТВА.</span>
          </h2>
        </div>
        <p>
          Твой ритм. Твои возможности.
          <br />
          Твой следующий большой проект.
        </p>
      </div>
      <div className="plans">
        {plans.map((plan) => (
          <article className={`plan glass ${plan.featured ? 'featured' : ''}`} key={plan.id}>
            {plan.featured && <span className="plan-label">ДЛЯ СОЗДАТЕЛЕЙ</span>}
            <span className="plan-name">{plan.name}</span>
            <p>{plan.caption}</p>
            <div className="plan-price">
              {plan.price ?? 'Скоро'}
              <small>{plan.price ? 'в месяц' : 'Условия готовятся'}</small>
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
      <p className="pricing-note">
        Цены и лимиты будут объявлены перед запуском. Платежи пока не подключены.
      </p>
      <Modal
        open={!!selected}
        title={`${selected?.name} — скоро`}
        onClose={() => setSelected(null)}
      >
        <p className="muted">
          Мы готовим условия этого тарифа. Сейчас подписка и оплата недоступны. Доступ к генерациям
          в MVP выдаётся администратором.
        </p>
        <button className="glass-button" onClick={() => setSelected(null)}>
          Понятно
          <Check size={17} />
        </button>
      </Modal>
    </section>
  );
}
