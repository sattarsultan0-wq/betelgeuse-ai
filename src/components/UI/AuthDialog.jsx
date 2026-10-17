import { useI18n } from '../../i18n/index';
import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowUpRight, LoaderCircle, LockKeyhole } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTelegram } from '../../hooks/useTelegram';
import { api } from '../../services/api';
import { Star } from './Brand';
import Modal from './Modal';

function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M21.6 12.23c0-.71-.06-1.39-.18-2.05H12v3.88h5.38a4.6 4.6 0 0 1-2 3.02v2.51h3.24c1.9-1.75 2.98-4.33 2.98-7.36Z"
      />
      <path
        fill="#34A853"
        d="M12 22c2.7 0 4.96-.9 6.62-2.42l-3.24-2.5c-.9.6-2.06.97-3.38.97-2.6 0-4.8-1.75-5.6-4.1H3.06v2.6A10 10 0 0 0 12 22Z"
      />
      <path
        fill="#FBBC05"
        d="M6.4 13.95A6 6 0 0 1 6.08 12c0-.68.12-1.34.32-1.95V7.45H3.06A10 10 0 0 0 2 12c0 1.61.39 3.14 1.06 4.55l3.34-2.6Z"
      />
      <path
        fill="#EA4335"
        d="M12 5.95c1.47 0 2.79.51 3.82 1.51l2.87-2.86A9.62 9.62 0 0 0 12 2a10 10 0 0 0-8.94 5.45l3.34 2.6c.8-2.35 3-4.1 5.6-4.1Z"
      />
    </svg>
  );
}
function AppleMark() {
  return (
    <svg viewBox="0 0 24 24" width="21" height="21" fill="currentColor" aria-hidden="true">
      <path d="M17.05 12.54c.03 3.16 2.77 4.21 2.8 4.23-.02.08-.44 1.5-1.45 2.96-.88 1.26-1.79 2.52-3.22 2.55-1.4.04-1.85-.82-3.45-.82s-2.1.8-3.42.86c-1.38.05-2.43-1.36-3.31-2.62-1.8-2.59-3.17-7.3-1.32-10.48a5.15 5.15 0 0 1 4.35-2.63c1.36-.03 2.64.91 3.47.91.83 0 2.4-1.12 4.04-.95.68.03 2.59.27 3.82 2.07-.1.07-2.29 1.33-2.26 3.92ZM14.37 4.8c.73-.88 1.22-2.1 1.09-3.32-1.05.04-2.33.7-3.08 1.58-.68.78-1.28 2.03-1.12 3.22 1.17.09 2.37-.59 3.11-1.48Z" />
    </svg>
  );
}

export default function AuthDialog() {
  const { t } = useI18n();
  const { dialog, setDialog, authenticate, authNotice, setAuthNotice } = useAuth();
  const initData = useTelegram();
  const [error, setError] = useState(''),
    [busy, setBusy] = useState(false),
    [socialBusy, setSocialBusy] = useState(null);
  const [providers, setProviders] = useState(null);
  const previousMode = useRef('login'),
    action = useRef(0);
  if (dialog) previousMode.current = dialog;
  const mode = dialog || previousMode.current;
  const register = mode === 'register';
  const working = busy || !!socialBusy;

  useEffect(() => {
    action.current += 1;
    setError(dialog ? authNotice : '');
    setBusy(false);
    setSocialBusy(null);
    if (dialog && authNotice) setAuthNotice('');
    if (!dialog) return;
    const controller = new AbortController();
    api('/auth/providers', { signal: controller.signal })
      .then((data) => setProviders(data.providers))
      .catch((err) => {
        if (err.name !== 'AbortError') setProviders(null);
      });
    return () => controller.abort();
  }, [dialog]);

  async function submit(event) {
    event.preventDefault();
    const current = ++action.current;
    setBusy(true);
    setError('');
    const fields = Object.fromEntries(new FormData(event.currentTarget));
    try {
      await authenticate(mode, fields);
    } catch (err) {
      if (current === action.current) setError(err.message);
    } finally {
      if (current === action.current) setBusy(false);
    }
  }

  async function socialLogin(provider) {
    const current = ++action.current;
    setError('');
    setSocialBusy(provider);
    try {
      const data = await api(`/auth/oauth/${provider}/start`, { method: 'POST' });
      if (current === action.current) window.location.assign(data.authorizationUrl);
    } catch (err) {
      if (current === action.current) {
        setError(err.message);
        setSocialBusy(null);
      }
    }
  }

  return (
    <Modal
      open={!!dialog}
      title={t(register ? 'Начни свою историю' : 'С возвращением')}
      onClose={() => setDialog(null)}
      className="auth-modal"
      showTitle={false}
    >
      <div className="auth-shell">
        <aside className="auth-visual" aria-hidden="true">
          <div className="auth-visual-brand">
            <Star />
            <span>BETELGEUSE</span>
          </div>
          <div className="auth-visual-art" />
          <div className="auth-visual-copy">
            <span className="eyebrow">{t('ТВОЯ НОВАЯ ОРБИТА')}</span>
            <p>
              {t('БОЛЬШИЕ ИДЕИ.')}
              <br />
              <span>
                {t('БЕСКОНЕЧНЫЕ')}
                <br />
                {t('ВОЗМОЖНОСТИ.')}
              </span>
            </p>
            <small>
              {t('Одно пространство для всего,')}
              <br />
              {t('что ты можешь представить.')}
            </small>
          </div>
          <span className="auth-visual-bottom">
            {t('FROM AN IDEA TO INFINITY ')}
            <Star />
          </span>
        </aside>
        <div className="auth-content">
          <div className="auth-heading">
            <span className="eyebrow">{t('ТВОЁ ТВОРЧЕСКОЕ ПРОСТРАНСТВО')}</span>
            <h2>{t(register ? 'Начни свою историю' : 'С возвращением')}</h2>
            <p>
              {t(
                register
                  ? 'Создай аккаунт. Дай идеям новую жизнь.'
                  : 'Войди и продолжи создавать невероятное.',
              )}
            </p>
          </div>
          <div className="social-login-buttons">
            {[
              ['google', 'Google', GoogleMark],
              ['apple', 'Apple', AppleMark],
            ].map(([provider, label, Mark]) => (
              <button
                key={provider}
                className={`social-login-button ${provider}`}
                onClick={() => socialLogin(provider)}
                disabled={working}
                aria-busy={socialBusy === provider}
              >
                {socialBusy === provider ? <LoaderCircle size={20} className="spin" /> : <Mark />}
                <span>
                  {t('Войти через ')}
                  {t(label)}
                </span>
                {providers?.[provider]?.available === false && <small>{t('Скоро')}</small>}
              </button>
            ))}
          </div>
          <div className="auth-divider">
            <span>{t('или с помощью email')}</span>
          </div>
          <AnimatePresence mode="wait" initial={false}>
            <motion.form
              className="auth-form"
              key={mode}
              onSubmit={submit}
              initial={{ opacity: 0, y: 7 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              transition={{ duration: 0.16 }}
            >
              {register && (
                <label>
                  {t('Имя')}
                  <input
                    name="name"
                    autoComplete="name"
                    required
                    minLength={2}
                    maxLength={80}
                    placeholder={t('Как тебя зовут?')}
                    disabled={working}
                  />
                </label>
              )}
              <label>
                Email
                <input
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  maxLength={254}
                  placeholder="you@example.com"
                  disabled={working}
                />
              </label>
              <label>
                {t('Пароль')}
                <input
                  name="password"
                  type="password"
                  autoComplete={register ? 'new-password' : 'current-password'}
                  required
                  minLength={register ? 10 : 1}
                  maxLength={72}
                  placeholder={t(register ? 'Не менее 10 символов' : 'Твой пароль')}
                  disabled={working}
                />
              </label>
              {error && (
                <p className="error auth-error" role="alert">
                  {t(error)}
                </p>
              )}
              <button className="glass-button primary auth-submit" disabled={working}>
                {busy ? <LoaderCircle className="spin" size={19} /> : <ArrowUpRight size={19} />}{' '}
                {t(register ? 'Создать аккаунт' : 'Войти в аккаунт')}
              </button>
            </motion.form>
          </AnimatePresence>
          {initData && (
            <button
              className="glass-button telegram-login"
              disabled={working}
              onClick={async () => {
                const current = ++action.current;
                setBusy(true);
                setError('');
                try {
                  await authenticate('telegram', { initData });
                } catch (err) {
                  if (current === action.current) setError(err.message);
                } finally {
                  if (current === action.current) setBusy(false);
                }
              }}
            >
              {t('Войти через Telegram')}
            </button>
          )}
          <div className="auth-switch">
            <span>{t(register ? 'Уже есть аккаунт?' : 'Пока нет аккаунта?')}</span>
            <button
              className="text-button"
              disabled={working}
              onClick={() => setDialog(register ? 'login' : 'register')}
            >
              {t(register ? 'Войти' : 'Создать аккаунт')}
              <ArrowUpRight size={13} />
            </button>
          </div>
          <p className="auth-security">
            <LockKeyhole size={12} />
            <span>{t('Защищённый вход. Твоё пространство — только твоё.')}</span>
          </p>
        </div>
      </div>
    </Modal>
  );
}
