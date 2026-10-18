import { useEffect, useId, useRef, useState } from 'react';
import { ArrowUpRight, LogOut, Menu, Shield, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useI18n } from '../../i18n';
import Brand from '../UI/Brand';
import LanguageMenu from '../UI/LanguageMenu';
import './MobileHeader.css';

export default function MobileHeader({ links }) {
  const { t } = useI18n();
  const { user, setDialog, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [error, setError] = useState('');
  const root = useRef(null);
  const trigger = useRef(null);
  const menuId = useId();

  useEffect(() => {
    const update = () => setScrolled(window.scrollY > 30);
    update();
    window.addEventListener('scroll', update, { passive: true });
    return () => window.removeEventListener('scroll', update);
  }, []);

  useEffect(() => {
    if (!open) return;
    const dismiss = (event) => {
      if (!root.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener('pointerdown', dismiss);
    return () => document.removeEventListener('pointerdown', dismiss);
  }, [open]);

  function showAuth(mode) {
    setOpen(false);
    setDialog(mode);
  }

  async function signOut() {
    setError('');
    try {
      await logout();
      setOpen(false);
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <header
      className={`mobile-header${scrolled || open ? ' mobile-header-solid' : ''}`}
      ref={root}
      onKeyDown={(event) => {
        if (event.key === 'Escape' && open) {
          event.preventDefault();
          setOpen(false);
          trigger.current?.focus();
        }
      }}
    >
      <div className="mobile-header-bar">
        <button
          ref={trigger}
          type="button"
          className="mobile-menu-toggle"
          aria-label={t(open ? 'Закрыть меню' : 'Открыть меню')}
          aria-expanded={open}
          aria-controls={menuId}
          onClick={() => setOpen((value) => !value)}
        >
          {open ? <X size={22} aria-hidden="true" /> : <Menu size={22} aria-hidden="true" />}
        </button>
        <div className="mobile-header-brand" onClick={() => setOpen(false)}>
          <Brand />
        </div>
        <LanguageMenu />
      </div>
      <div
        id={menuId}
        className="mobile-header-panel"
        data-open={open}
        aria-hidden={!open}
        inert={!open}
      >
        <div className="mobile-header-account">
          {user ? (
            <>
              <Link
                className="mobile-account-name"
                to="/library"
                onClick={() => setOpen(false)}
                title={user.name}
              >
                {user.name}
              </Link>
              <button
                type="button"
                className="mobile-account-logout"
                aria-label={t('Выйти')}
                title={t('Выйти')}
                onClick={signOut}
              >
                <LogOut size={19} aria-hidden="true" />
              </button>
              {user.isAdmin && (
                <Link
                  className="mobile-account-admin"
                  to="/admin"
                  aria-label={t('Админка')}
                  title={t('Админка')}
                  onClick={() => setOpen(false)}
                >
                  <Shield size={19} aria-hidden="true" />
                </Link>
              )}
            </>
          ) : (
            <>
              <button
                type="button"
                className="mobile-signup"
                onClick={() => showAuth('register')}
              >
                {t('Регистрация')}
                <ArrowUpRight size={17} aria-hidden="true" />
              </button>
              <button type="button" className="mobile-login" onClick={() => showAuth('login')}>
                {t('Войти')}
              </button>
            </>
          )}
        </div>
        <nav className="mobile-header-nav" aria-label={t('Основная навигация')}>
          {links.map(([label, id]) => (
            <a key={id} href={`/#${id}`} onClick={() => setOpen(false)}>
              {t(label)}
              <ArrowUpRight size={16} aria-hidden="true" />
            </a>
          ))}
        </nav>
      </div>
      {error && (
        <p className="mobile-header-error error" role="alert">
          {t(error)}
        </p>
      )}
    </header>
  );
}
