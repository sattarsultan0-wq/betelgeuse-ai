import { useSyncExternalStore } from 'react';
import { themeKey, readPreference, savePreference } from '../i18n/preferences';

let theme = readPreference(themeKey, ['dark', 'light'], 'dark');
const listeners = new Set();
function applyTheme(next, persist = true) {
  theme = next;
  document.documentElement.dataset.theme = theme;
  if (persist) savePreference(themeKey, theme);
  const workspace = document.documentElement.dataset.workspace === 'true';
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute('content', workspace && theme === 'light' ? '#f2f4f8' : '#050505');
  listeners.forEach((listener) => listener());
}
applyTheme(theme, false);
window.addEventListener('storage', (event) => {
  if (event.key === themeKey) applyTheme(event.newValue === 'light' ? 'light' : 'dark', false);
});
export function setTheme(next) {
  if (['dark', 'light'].includes(next)) applyTheme(next);
}
export function updateWorkspaceTheme(pathname) {
  document.documentElement.dataset.workspace = String(
    ['/workflow', '/library', '/billing', '/trends'].includes(pathname.replace(/\/$/, '')),
  );
  applyTheme(theme, false);
}
export function useTheme() {
  const value = useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => theme,
    () => 'dark',
  );
  return { theme: value, setTheme };
}
