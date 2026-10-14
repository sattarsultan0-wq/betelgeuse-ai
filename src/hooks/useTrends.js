import { useEffect, useSyncExternalStore } from 'react';
import { api } from '../services/api';

// One API catalog and one request shared by Showcase and the workspace gallery.
const listeners = new Set();
let snapshot = { items: [], loading: true, error: '' },
  request,
  fetchedAt = 0;
function publish(value) {
  snapshot = value;
  for (const listener of listeners) listener();
}
function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
const getSnapshot = () => snapshot;
export function remoteTrend(item) {
  try {
    const url = new URL(item.src);
    return url.protocol === 'https:' && !url.username && !url.password;
  } catch {
    return false;
  }
}
async function load(force = false) {
  if (request) return request;
  if (!force && fetchedAt && Date.now() - fetchedAt < 5 * 60 * 1000) return;
  publish({ ...snapshot, loading: true, error: '' });
  request = api('/trends')
    .then((data) => {
      if (!Array.isArray(data.trends))
        throw new Error('Сервер вернул некорректный каталог трендов.');
      const ids = new Set();
      const items = data.trends
        .filter((item) => {
          if (typeof item.id !== 'string' || ids.has(item.id) || typeof item.videoUrl !== 'string')
            return false;
          ids.add(item.id);
          return true;
        })
        .map((item) => ({
          ...item,
          trendId: item.id,
          src: item.videoUrl,
          poster: item.posterUrl || undefined,
          model: item.displayModel || 'Авторский концепт',
        }));
      fetchedAt = Date.now();
      publish({ items, loading: false, error: '' });
    })
    .catch((error) => publish({ ...snapshot, loading: false, error: error.message }))
    .finally(() => {
      request = null;
    });
  return request;
}
export default function useTrends() {
  const value = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  useEffect(() => {
    load();
  }, []);
  return { ...value, reload: () => load(true) };
}
