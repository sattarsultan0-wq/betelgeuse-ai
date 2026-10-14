import { joinApiPath, resolveApiBase } from './api-url.js';

export function apiUrl(path) {
  const base = resolveApiBase(import.meta.env.VITE_API_URL, { production: import.meta.env.PROD });
  return joinApiPath(base, path);
}
let csrfToken, csrfRequest;
async function csrf() {
  if (!csrfToken) {
    if (!csrfRequest)
      csrfRequest = (async () => {
        const response = await fetch(apiUrl('/auth/csrf'), { credentials: 'include' });
        if (!response.ok) throw new Error('Не удалось установить защищённое соединение с API');
        csrfToken = (await response.json()).token;
      })().finally(() => {
        csrfRequest = undefined;
      });
    await csrfRequest;
  }
  return csrfToken;
}
export async function api(path, options = {}) {
  const url = apiUrl(path);
  const method = options.method || 'GET';
  const headers = { ...options.headers };
  if (!['GET', 'HEAD'].includes(method)) headers['X-CSRF-Token'] = await csrf();
  if (options.body && !(options.body instanceof FormData))
    headers['Content-Type'] = 'application/json';
  let response;
  try {
    response = await fetch(url, {
      ...options,
      credentials: 'include',
      method,
      headers,
      body:
        options.body instanceof FormData
          ? options.body
          : options.body
            ? JSON.stringify(options.body)
            : undefined,
    });
  } catch (error) {
    if (error.name === 'AbortError') throw error;
    throw new Error('API недоступен. Проверьте подключение к серверу.');
  }
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (response.status === 401 && !path.startsWith('/auth/'))
      window.dispatchEvent(new Event('betelgeuse:session-expired'));
    if (response.status === 403 && data.code === 'CSRF') csrfToken = undefined;
    const error = new Error(data.message || 'Не удалось выполнить запрос');
    error.status = response.status;
    throw error;
  }
  return data;
}
export async function downloadVideo(id) {
  const response = await fetch(apiUrl(`/generations/${id}/download`), {
    credentials: 'include',
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || 'Не удалось скачать видео');
  }
  const url = URL.createObjectURL(await response.blob());
  const link = document.createElement('a');
  link.href = url;
  link.download = `betelgeuse-${id}.mp4`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function downloadImage(id) {
  const response = await fetch(apiUrl(`/uploads/${id}`), { credentials: 'include' });
  if (!response.ok) throw new Error('Не удалось скачать изображение');
  const blob = await response.blob();
  const extension =
    { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp' }[blob.type] || 'image';
  const url = URL.createObjectURL(blob),
    link = document.createElement('a');
  link.href = url;
  link.download = `betelgeuse-${id}.${extension}`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
