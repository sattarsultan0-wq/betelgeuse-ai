import { useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import {
  Boxes,
  ChevronDown,
  Folder,
  Library,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
  Wallet,
  X,
  Shield,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import Modal from '../UI/Modal';

export default function Sidebar({
  compact,
  onCompact,
  mobileOpen,
  onClose,
  billing,
  billingError,
}) {
  const { user, logout } = useAuth();
  const [settings, setSettings] = useState(false),
    [error, setError] = useState('');
  const plan = billingError
    ? 'Тариф недоступен'
    : billing
      ? billing.subscription?.plan.name || 'Без подписки'
      : 'Загрузка тарифа…';
  return (
    <>
      {mobileOpen && (
        <button className="wf-sidebar-backdrop" aria-label="Закрыть навигацию" onClick={onClose} />
      )}
      <aside
        className={`wf-sidebar ${compact ? 'is-compact' : ''} ${mobileOpen ? 'is-mobile-open' : ''}`}
        aria-label="Навигация рабочего пространства"
      >
        <div className="wf-sidebar-brand-row">
          <Link className="wf-sidebar-brand" to="/" aria-label="Betelgeuse — на главную">
            <span>✦</span>
            <strong>BETELGEUSE</strong>
          </Link>
          <button
            className="icon-button wf-sidebar-close"
            aria-label="Закрыть навигацию"
            onClick={onClose}
          >
            <X size={18} />
          </button>
        </div>
        <span className="wf-sidebar-caption">ТВОЁ ПРОСТРАНСТВО</span>
        <nav className="wf-sidebar-nav">
          <NavLink to="/workflow" onClick={onClose} title="Workflow">
            <Boxes size={19} />
            <span>Workflow</span>
          </NavLink>
          <button disabled title="Проекты появятся позже">
            <Folder size={19} />
            <span>Проекты</span>
            <small>Скоро</small>
          </button>
          <NavLink to="/library" onClick={onClose} title="Библиотека">
            <Library size={19} />
            <span>Библиотека</span>
          </NavLink>
          <NavLink to="/billing" onClick={onClose} title="Баланс">
            <Wallet size={19} />
            <span>Баланс</span>
          </NavLink>
          {user.isAdmin && (
            <Link to="/admin" title="Админка">
              <Shield size={19} />
              <span>Админка</span>
            </Link>
          )}
        </nav>
        <div className="wf-sidebar-credits">
          <span>ДОСТУПНО КРЕДИТОВ</span>
          <strong>
            {user.generationCredits ?? 0}
            <small>✦</small>
          </strong>
          <Link to="/billing" onClick={onClose}>
            Управлять балансом →
          </Link>
        </div>
        <div className="wf-sidebar-bottom">
          <button
            className="wf-sidebar-setting"
            onClick={() => setSettings(true)}
            title="Настройки"
          >
            <Settings size={18} />
            <span>Настройки</span>
          </button>
          <button
            className="wf-sidebar-collapse"
            onClick={onCompact}
            aria-label={compact ? 'Развернуть боковую панель' : 'Свернуть боковую панель'}
          >
            {compact ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
            <span>Компактный режим</span>
          </button>
          <details className="wf-user-menu">
            <summary title={user.name}>
              <span className="wf-avatar">{user.name?.slice(0, 1).toUpperCase() || '✦'}</span>
              <span className="wf-user-info">
                <strong>{user.name}</strong>
                <small>{user.email}</small>
                <small>{plan}</small>
              </span>
              <ChevronDown size={14} />
            </summary>
            <div className="wf-user-popover">
              <p>{user.email}</p>
              <button onClick={() => logout().catch((err) => setError(err.message))}>
                <LogOut size={16} /> Выйти из аккаунта
              </button>
            </div>
          </details>
          {error && (
            <p className="wf-error" role="alert">
              {error}
            </p>
          )}
        </div>
      </aside>
      <Modal
        open={settings}
        title="Настройки аккаунта"
        onClose={() => setSettings(false)}
        className="wf-dialog"
      >
        <dl className="wf-settings-list">
          <dt>Имя</dt>
          <dd>{user.name}</dd>
          <dt>Email</dt>
          <dd>{user.email}</dd>
          <dt>Тариф</dt>
          <dd>{plan}</dd>
        </dl>
        <p className="muted">Редактирование профиля появится позже.</p>
      </Modal>
    </>
  );
}
