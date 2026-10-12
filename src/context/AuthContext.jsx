import { createContext, useContext, useEffect, useState } from 'react';
import { api } from '../services/api';
const AuthContext = createContext(null);
const oauthMessages = {
  canceled: 'Вход отменён. Можно выбрать другой способ.',
  account_exists: 'Этот email уже зарегистрирован. Войди с паролем.',
  expired: 'Сессия входа истекла. Попробуй ещё раз.',
  failed: 'Не удалось завершить вход. Попробуй ещё раз.',
};
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null),
    [loading, setLoading] = useState(true),
    [dialog, setDialog] = useState(null);
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
        if (mounted) setUser(data.user);
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
  async function authenticate(mode, body) {
    const data = await api(`/auth/${mode}`, { method: 'POST', body });
    setUser(data.user);
    setDialog(null);
    setAuthNotice('');
  }
  async function refresh() {
    const data = await api('/users/me');
    setUser(data.user);
  }
  async function logout() {
    await api('/auth/logout', { method: 'POST' });
    setUser(null);
  }
  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        dialog,
        setDialog,
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
