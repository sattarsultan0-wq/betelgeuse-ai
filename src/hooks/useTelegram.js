import { useEffect, useState } from 'react';
let sdkPromise;
function loadSDK() {
  if (window.Telegram?.WebApp) return Promise.resolve(window.Telegram.WebApp);
  if (!sdkPromise)
    sdkPromise = new Promise((resolve) => {
      const script = document.createElement('script');
      script.src = 'https://telegram.org/js/telegram-web-app.js';
      script.async = true;
      script.onload = () => resolve(window.Telegram?.WebApp);
      script.onerror = () => resolve(null);
      document.head.append(script);
    });
  return sdkPromise;
}
export function useTelegram() {
  const [initData, setInitData] = useState('');
  useEffect(() => {
    let mounted = true,
      cleanup;
    loadSDK().then((app) => {
      if (!mounted || !app?.initData) return;
      app.ready();
      app.expand();
      setInitData(app.initData);
      document.documentElement.classList.add('telegram-webview');
      const safe = () => {
        const top = Math.max(app.safeAreaInset?.top || 0, app.contentSafeAreaInset?.top || 0),
          bottom = Math.max(app.safeAreaInset?.bottom || 0, app.contentSafeAreaInset?.bottom || 0);
        document.documentElement.style.setProperty('--safe-top', `${top}px`);
        document.documentElement.style.setProperty('--safe-bottom', `${bottom}px`);
      };
      safe();
      app.onEvent?.('safeAreaChanged', safe);
      app.onEvent?.('contentSafeAreaChanged', safe);
      cleanup = () => {
        app.offEvent?.('safeAreaChanged', safe);
        app.offEvent?.('contentSafeAreaChanged', safe);
      };
    });
    return () => {
      mounted = false;
      cleanup?.();
    };
  }, []);
  return initData;
}
