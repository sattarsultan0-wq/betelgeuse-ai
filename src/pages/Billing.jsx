import { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { ArrowUpRight, LoaderCircle, Wallet } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import PlanCards from '../components/Pricing/PlanCards';
import Modal from '../components/UI/Modal';

export default function Billing() {
  const { user } = useAuth();
  const { billing, billingError } = useOutletContext();
  const [topup, setTopup] = useState(false);
  return (
    <section className="wf-page wf-billing">
      <header className="wf-page-heading">
        <span className="eyebrow">ТВОИ ВОЗМОЖНОСТИ</span>
        <h1>
          Баланс и тарифы<span className="dim">.</span>
        </h1>
        <p>Больше пространства для следующей большой идеи.</p>
      </header>
      <div className="wf-billing-summary">
        <article className="wf-balance-card">
          <Wallet size={21} />
          <span>Текущий баланс</span>
          <strong>
            {user.generationCredits ?? 0}
            <small>кредитов</small>
          </strong>
          <button className="glass-button primary" onClick={() => setTopup(true)}>
            Пополнить <ArrowUpRight size={17} />
          </button>
          {user.isAdmin && <small>Администратор · внутренние кредиты не списываются</small>}
        </article>
        <article className="wf-subscription-card">
          <span className="eyebrow">ТЕКУЩИЙ ТАРИФ</span>
          {billingError ? (
            <p className="wf-error" role="alert">
              {billingError}
            </p>
          ) : !billing ? (
            <LoaderCircle className="spin" />
          ) : (
            <>
              <h2>{billing.subscription?.plan.name || 'Без подписки'}</h2>
              <p>
                {billing.subscription
                  ? billing.subscription.expiresAt
                    ? `Действует до ${new Date(billing.subscription.expiresAt).toLocaleDateString('ru-RU')}`
                    : 'Активная подписка'
                  : 'Подписка пока не оформлена. Доступные кредиты можно использовать для генераций.'}
              </p>
            </>
          )}
          <small>Стоимость генерации показывается до отправки запроса.</small>
        </article>
      </div>
      <h2 className="wf-billing-plans-title">Выбери свой ритм</h2>
      <PlanCards workspace />
      <Modal
        open={topup}
        title="Пополнение — скоро"
        onClose={() => setTopup(false)}
        className="wf-dialog"
      >
        <p className="muted">
          Платежи пока не подключены. Пополнить баланс онлайн сейчас нельзя. Доступ к кредитам
          выдаёт администратор.
        </p>
        <button className="glass-button" onClick={() => setTopup(false)}>
          Понятно
        </button>
      </Modal>
    </section>
  );
}
