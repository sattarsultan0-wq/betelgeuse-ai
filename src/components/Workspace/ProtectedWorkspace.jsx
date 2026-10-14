import { Outlet, useLocation, Link } from 'react-router-dom';
import { ArrowUpRight, LoaderCircle, LockKeyhole } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import '../../styles/workflow.css';
import WorkflowLoader from './WorkflowLoader';

export default function ProtectedWorkspace() {
  const { user, loading, requestAuth } = useAuth();
  const { pathname } = useLocation();
  if (loading)
    return pathname.replace(/\/$/, '') === '/workflow' ? (
      <WorkflowLoader />
    ) : (
      <div className="wf-access">
        <LoaderCircle className="spin" />
        <p>Проверяем сессию…</p>
      </div>
    );
  if (user) return <Outlet />;
  return (
    <section className="wf-access">
      <Link to="/" className="wf-access-brand">
        ✦ BETELGEUSE
      </Link>
      <LockKeyhole size={32} />
      <h1>
        Твоё пространство
        <br />
        <span className="dim">ждёт тебя.</span>
      </h1>
      <p>Войди, чтобы создавать и видеть свои материалы, историю и баланс.</p>
      <button className="glass-button primary" onClick={() => requestAuth('login', pathname)}>
        Войти в аккаунт <ArrowUpRight size={18} />
      </button>
      <Link className="text-button" to="/">
        Вернуться на главную
      </Link>
    </section>
  );
}
