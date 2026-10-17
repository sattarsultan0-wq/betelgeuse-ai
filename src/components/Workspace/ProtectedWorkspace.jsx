import { useI18n } from '../../i18n/index';
import { Outlet, useLocation, Link } from 'react-router-dom';
import { ArrowUpRight, LoaderCircle, LockKeyhole } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import '../../styles/workflow.css';
import WorkflowLoader from './WorkflowLoader';
import { Star } from '../UI/Brand';

export default function ProtectedWorkspace() {
  const { t } = useI18n();
  const { user, loading, requestAuth } = useAuth();
  const { pathname } = useLocation();
  if (loading)
    return pathname.replace(/\/$/, '') === '/workflow' ? (
      <WorkflowLoader />
    ) : (
      <div className="wf-access">
        <LoaderCircle className="spin" />
        <p>{t('Проверяем сессию…')}</p>
      </div>
    );
  if (user) return <Outlet />;
  return (
    <section className="wf-access">
      <Link to="/" className="wf-access-brand">
        <Star /> BETELGEUSE
      </Link>
      <LockKeyhole size={32} />
      <h1>
        {t('Твоё пространство')}
        <br />
        <span className="dim">{t('ждёт тебя.')}</span>
      </h1>
      <p>{t('Войди, чтобы создавать и видеть свои материалы, историю и баланс.')}</p>
      <button className="glass-button primary" onClick={() => requestAuth('login', pathname)}>
        {t('Войти в аккаунт ')}
        <ArrowUpRight size={18} />
      </button>
      <Link className="text-button" to="/">
        {t('Вернуться на главную')}
      </Link>
    </section>
  );
}
