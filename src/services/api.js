export const API_BASE = (import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '');
let csrfToken, csrfRequest;
async function csrf() {
  if (!csrfToken) {
    if (!csrfRequest)
      csrfRequest = (async () => {
        const response = await fetch(`${API_BASE}/auth/csrf`, { credentials: 'include' });
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
  const method = options.method || 'GET';
  const headers = { ...options.headers };
  if (!['GET', 'HEAD'].includes(method)) headers['X-CSRF-Token'] = await csrf();
  if (options.body && !(options.body instanceof FormData))
    headers['Content-Type'] = 'application/json';
  let response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      credentials: 'include',
      ...options,
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
    if (response.status === 403 && data.code === 'CSRF') csrfToken = undefined;
    const error = new Error(data.message || 'Не удалось выполнить запрос');
    error.status = response.status;
    throw error;
  }
  return data;
}
export async function downloadVideo(id) {
  const response = await fetch(`${API_BASE}/generations/${id}/download`, {
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
