import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
const AuthContext = createContext(null);
const returnKey = 'betelgeuse:auth-return';
const privatePaths = ['/workflow', '/trends', '/library', '/billing'];
function storedReturn() {
  try {
    const value = sessionStorage.getItem(returnKey);
    return privatePaths.includes(value) ? value : null;
  } catch {
    return null;
  }
}
function rememberReturn(path) {
  try {
    path ? sessionStorage.setItem(returnKey, path) : sessionStorage.removeItem(returnKey);
  } catch {
    /* Optional storage. */
  }
}
const oauthMessages = {
  canceled: 'Вход отменён. Можно выбрать другой способ.',
  account_exists: 'Этот email уже зарегистрирован. Войди с паролем.',
  expired: 'Сессия входа истекла. Попробуй ещё раз.',
  failed: 'Не удалось завершить вход. Попробуй ещё раз.',
};
export function AuthProvider({ children }) {
  const navigate = useNavigate();
  const returnTo = useRef(storedReturn());
  const [user, setUser] = useState(null),
    [loading, setLoading] = useState(true),
    [dialog, updateDialog] = useState(null);
  const [oauthResult] = useState(() =>
    new URLSearchParams(window.location.search).get('auth_result'),
  );
  const [authNotice, setAuthNotice] = useState(() =>
    oauthResult && oauthResult !== 'success'
      ? oauthMessages[oauthResult] || oauthMessages.failed
      : '',
  );
  useEffect(() => {
    let mounted = true;
    const params = new URLSearchParams(window.location.search);
    if (oauthResult) {
      params.delete('auth_result');
      window.history.replaceState(
        window.history.state,
        '',
        `${window.location.pathname}${params.size ? `?${params}` : ''}${window.location.hash}`,
      );
      if (oauthResult !== 'success') setDialog('login');
    }
    api('/auth/me')
      .then((data) => {
        if (mounted) {
          setUser(data.user);
          if (oauthResult === 'success' && returnTo.current) {
            const destination = returnTo.current;
            returnTo.current = null;
            rememberReturn(null);
            navigate(destination, { replace: true });
          }
        }
      })
      .catch(() => {
        if (mounted && oauthResult === 'success') setDialog('login');
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);
  useEffect(() => {
    const expired = () => {
      setUser(null);
      setAuthNotice('Сессия истекла. Войди снова.');
    };
    window.addEventListener('betelgeuse:session-expired', expired);
    return () => window.removeEventListener('betelgeuse:session-expired', expired);
  }, []);
  function setDialog(mode) {
    if (!mode) {
      returnTo.current = null;
      rememberReturn(null);
    }
    updateDialog(mode);
  }
  function requestAuth(mode = 'login', destination = '/workflow') {
    const normalized = destination.replace(/\/$/, '');
    const target = privatePaths.includes(normalized) ? normalized : '/workflow';
    if (user) {
      navigate(target);
      return;
    }
    returnTo.current = target;
    rememberReturn(target);
    updateDialog(mode);
  }
  async function authenticate(mode, body) {
    const data = await api(`/auth/${mode}`, { method: 'POST', body });
    setUser(data.user);
    const destination = returnTo.current;
    setDialog(null);
    setAuthNotice('');
    if (destination) navigate(destination, { replace: true });
  }
  async function refresh() {
    const data = await api('/users/me');
    setUser(data.user);
  }
  async function logout() {
    await api('/auth/logout', { method: 'POST' });
    setUser(null);
    returnTo.current = null;
    rememberReturn(null);
  }
  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        dialog,
        setDialog,
        requestAuth,
        authenticate,
        logout,
        refresh,
        authNotice,
        setAuthNotice,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
export const useAuth = () => useContext(AuthContext);
