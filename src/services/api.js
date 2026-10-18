import { joinApiPath, resolveApiBase } from './api-url.js';

export function apiUrl(path) {
  const base = resolveApiBase(import.meta.env.VITE_API_URL, {
    production: import.meta.env.PROD,
  });
  return joinApiPath(base, path);
}
let csrfToken, csrfRequest;
function apiError(response, data) {
  const error = new Error(data.message || 'Не удалось выполнить запрос');
  error.status = response.status;
  error.code = data.code;
  error.reason = data.reason;
  if (error.code === 'PRICE_CHANGED') {
    error.currentQuote = data.currentQuote;
    window.dispatchEvent(new Event('betelgeuse:pricing-changed'));
  }
  if (error.code === 'CSRF' && ['COOKIE_MISSING', 'COOKIE_INVALID'].includes(error.reason)) {
    error.code = 'CSRF_COOKIE_UNAVAILABLE';
    error.message =
      'Не удалось установить защищённое соединение: браузер не передаёт cookie сайта. Обратитесь в поддержку.';
  }
  return error;
}
async function request(url, options = {}) {
  try {
    return await fetch(url, { ...options, credentials: 'include', cache: 'no-store' });
  } catch (error) {
    if (error.name === 'AbortError') throw error;
    throw new Error('API недоступен. Проверьте подключение к серверу.');
  }
}
async function csrf() {
  if (!csrfToken) {
    if (!csrfRequest)
      csrfRequest = (async () => {
        // A JSON token alone does not prove the browser accepted its HttpOnly cookie.
        for (let attempt = 0; attempt < 2; attempt += 1) {
          const response = await request(apiUrl('/auth/csrf'));
          const data = await response.json().catch(() => ({}));
          if (!response.ok) throw apiError(response, data);
          if (typeof data.token !== 'string' || !/^[a-f0-9]{64}$/.test(data.token))
            throw new Error('Сервер не выдал корректный токен защищённого соединения.');
          const check = await request(apiUrl('/auth/csrf/check'), {
            headers: { 'X-CSRF-Token': data.token },
          });
          const verified = await check.json().catch(() => ({}));
          if (check.ok && verified.ok === true) {
            csrfToken = data.token;
            return;
          }
          if (
            attempt === 0 &&
            check.status === 403 &&
            verified.code === 'CSRF' &&
            verified.reason === 'TOKEN_MISMATCH'
          )
            continue;
          throw apiError(check, verified);
        }
      })().finally(() => {
        csrfRequest = undefined;
      });
    await csrfRequest;
  }
  return csrfToken;
}
export async function api(path, options = {}) {
  const url = apiUrl(path);
  const method = (options.method || 'GET').toUpperCase();
  const mutation = !['GET', 'HEAD', 'OPTIONS'].includes(method);
  const headers = { ...options.headers };
  if (options.body && !(options.body instanceof FormData))
    headers['Content-Type'] = 'application/json';
  const body =
    options.body instanceof FormData
      ? options.body
      : options.body
        ? JSON.stringify(options.body)
        : undefined;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    options.signal?.throwIfAborted();
    const token = mutation ? await csrf() : undefined;
    options.signal?.throwIfAborted();
    if (mutation) headers['X-CSRF-Token'] = token;
    const response = await request(url, { ...options, method, headers, body });
    const data = await response.json().catch(() => ({}));
    if (response.ok) return data;
    if (mutation && response.status === 403 && data.code === 'CSRF' && data.reason !== 'ORIGIN') {
      // The CSRF middleware rejected this request before any mutation. Retry at most once.
      // Do not erase a newer token already refreshed by another concurrent request.
      if (csrfToken === token) csrfToken = undefined;
      if (attempt === 0) continue;
    }
    if (response.status === 401 && !path.replace(/^\/api(?=\/)/, '').startsWith('/auth/'))
      window.dispatchEvent(new Event('betelgeuse:session-expired'));
    throw apiError(response, data);
  }
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
