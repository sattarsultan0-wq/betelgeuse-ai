import { useI18n } from '../../i18n/index';
import { useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import {
  Boxes,
  Flame,
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
import { Star } from '../UI/Brand';
import AppearanceSettings from './AppearanceSettings';

export default function Sidebar({
  compact,
  onCompact,
  mobileOpen,
  onClose,
  billing,
  billingError,
}) {
  const { t } = useI18n();
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
      <button
        type="button"
        className={`wf-sidebar-backdrop ${mobileOpen ? 'is-mobile-open' : ''}`}
        aria-label={t('Закрыть навигацию')}
        aria-hidden={!mobileOpen}
        tabIndex={mobileOpen ? 0 : -1}
        onClick={onClose}
      />
      <aside
        className={`wf-sidebar ${compact ? 'is-compact' : ''} ${mobileOpen ? 'is-mobile-open' : ''}`}
        aria-label={t('Навигация рабочего пространства')}
      >
        <div className="wf-sidebar-brand-row">
          <Link className="wf-sidebar-brand" to="/" aria-label={t('Betelgeuse — на главную')}>
            <Star />
            <strong>BETELGEUSE</strong>
          </Link>
          <button
            className="icon-button wf-sidebar-close"
            aria-label={t('Закрыть навигацию')}
            onClick={onClose}
          >
            <X size={18} />
          </button>
        </div>
        <span className="wf-sidebar-caption">{t('ТВОЁ ПРОСТРАНСТВО')}</span>
        <nav className="wf-sidebar-nav">
          <NavLink to="/workflow" onClick={onClose} title={t('Workflow')}>
            <Boxes size={19} />
            <span>{t('Workflow')}</span>
          </NavLink>
          <NavLink to="/trends" onClick={onClose} title={t('Тренды')}>
            <Flame size={19} />
            <span>{t('Тренды')}</span>
          </NavLink>
          <button disabled title={t('Проекты появятся позже')}>
            <Folder size={19} />
            <span>{t('Проекты')}</span>
            <small>{t('Скоро')}</small>
          </button>
          <NavLink to="/library" onClick={onClose} title={t('Библиотека')}>
            <Library size={19} />
            <span>{t('Библиотека')}</span>
          </NavLink>
          <NavLink to="/billing" onClick={onClose} title={t('Баланс')}>
            <Wallet size={19} />
            <span>{t('Баланс')}</span>
          </NavLink>
          {user.isAdmin && (
            <Link to="/admin" title={t('Админка')}>
              <Shield size={19} />
              <span>{t('Админка')}</span>
            </Link>
          )}
        </nav>
        <div className="wf-sidebar-credits">
          <span>{t('ДОСТУПНО КРЕДИТОВ')}</span>
          <strong>
            {t(user.generationCredits ?? 0)}
            <small>✦</small>
          </strong>
          <Link to="/billing" onClick={onClose}>
            {t('Управлять балансом →')}
          </Link>
        </div>
        <div className="wf-sidebar-bottom">
          <button
            className="wf-sidebar-setting"
            onClick={() => setSettings(true)}
            title={t('Настройки')}
          >
            <Settings size={18} />
            <span>{t('Настройки')}</span>
          </button>
          <button
            className="wf-sidebar-collapse"
            onClick={onCompact}
            aria-label={t(compact ? 'Развернуть боковую панель' : 'Свернуть боковую панель')}
          >
            {compact ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
            <span>{t('Компактный режим')}</span>
          </button>
          <details className="wf-user-menu">
            <summary title={user.name}>
              <span className="wf-avatar">{user.name?.slice(0, 1).toUpperCase() || '✦'}</span>
              <span className="wf-user-info">
                <strong>{user.name}</strong>
                <small>{user.email}</small>
                <small>{t(plan)}</small>
              </span>
              <ChevronDown size={14} />
            </summary>
            <div className="wf-user-popover">
              <p>{user.email}</p>
              <button onClick={() => logout().catch((err) => setError(err.message))}>
                <LogOut size={16} />
                {t(' Выйти из аккаунта')}
              </button>
            </div>
          </details>
          {error && (
            <p className="wf-error" role="alert">
              {t(error)}
            </p>
          )}
        </div>
      </aside>
      <Modal
        open={settings}
        title={t('Настройки аккаунта')}
        onClose={() => setSettings(false)}
        className="wf-dialog"
      >
        <dl className="wf-settings-list">
          <dt>{t('Имя')}</dt>
          <dd>{user.name}</dd>
          <dt>Email</dt>
          <dd>{user.email}</dd>
          <dt>{t('Тариф')}</dt>
          <dd>{t(plan)}</dd>
        </dl>
        <p className="muted">{t('Редактирование профиля появится позже.')}</p>
        <AppearanceSettings />
      </Modal>
    </>
  );
}
