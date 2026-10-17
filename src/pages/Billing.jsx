import { useI18n } from '../i18n/index';
import { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { ArrowUpRight, LoaderCircle, Wallet } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import PlanCards from '../components/Pricing/PlanCards';
import Modal from '../components/UI/Modal';

export default function Billing() {
  const { t, locale } = useI18n();
  const { user } = useAuth();
  const { billing, billingError } = useOutletContext();
  const [topup, setTopup] = useState(false);
  return (
    <section className="wf-page wf-billing">
      <header className="wf-page-heading">
        <span className="eyebrow">{t('ТВОИ ВОЗМОЖНОСТИ')}</span>
        <h1>
          {t('Баланс и тарифы')}
          <span className="dim">.</span>
        </h1>
        <p>{t('Больше пространства для следующей большой идеи.')}</p>
      </header>
      <div className="wf-billing-summary">
        <article className="wf-balance-card">
          <Wallet size={21} />
          <span>{t('Текущий баланс')}</span>
          <strong>
            {t(user.generationCredits ?? 0)}
            <small>{t('кредитов')}</small>
          </strong>
          <button className="glass-button primary" onClick={() => setTopup(true)}>
            {t('Пополнить ')}
            <ArrowUpRight size={17} />
          </button>
          {user.isAdmin && <small>{t('Администратор · внутренние кредиты не списываются')}</small>}
        </article>
        <article className="wf-subscription-card">
          <span className="eyebrow">{t('ТЕКУЩИЙ ТАРИФ')}</span>
          {billingError ? (
            <p className="wf-error" role="alert">
              {t(billingError)}
            </p>
          ) : !billing ? (
            <LoaderCircle className="spin" />
          ) : (
            <>
              <h2>{billing.subscription?.plan.name || t('Без подписки')}</h2>
              <p>
                {t(
                  billing.subscription
                    ? billing.subscription.expiresAt
                      ? `Действует до ${new Date(billing.subscription.expiresAt).toLocaleDateString(locale)}`
                      : 'Активная подписка'
                    : 'Подписка пока не оформлена. Доступные кредиты можно использовать для генераций.',
                )}
              </p>
            </>
          )}
          <small>{t('Стоимость генерации показывается до отправки запроса.')}</small>
        </article>
      </div>
      <h2 className="wf-billing-plans-title">{t('Выбери свой ритм')}</h2>
      <PlanCards workspace />
      <Modal
        open={topup}
        title={t('Пополнение — скоро')}
        onClose={() => setTopup(false)}
        className="wf-dialog"
      >
        <p className="muted">
          {t(
            'Платежи пока не подключены. Пополнить баланс онлайн сейчас нельзя. Доступ к кредитам выдаёт администратор.',
          )}
        </p>
        <button className="glass-button" onClick={() => setTopup(false)}>
          {t('Понятно')}
        </button>
      </Modal>
    </section>
  );
}
