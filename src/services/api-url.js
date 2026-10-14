// Pure URL helpers shared by the Vite client and configuration tests.
export function resolveApiBase(value, { production = false } = {}) {
  const configured = value?.trim();
  if (!configured) {
    if (production)
      throw new Error('API не настроен: укажите VITE_API_URL в Vercel и выполните новый деплой.');
    return '/api';
  }
  if (configured.replace(/\/+$/, '') === '/api') {
    if (production) throw new Error('Production API требует публичный HTTPS URL в VITE_API_URL.');
    return '/api';
  }
  let url;
  try {
    url = new URL(configured);
  } catch {
    throw new Error('VITE_API_URL должен содержать origin backend или URL с путём /api.');
  }
  const path = url.pathname.replace(/\/+$/, '');
  if (
    !['http:', 'https:'].includes(url.protocol) ||
    url.username || url.password || url.search || url.hash ||
    !['', '/api'].includes(path)
  )
    throw new Error('VITE_API_URL должен содержать origin backend или URL с путём /api.');
  if (production && (
    url.protocol !== 'https:' ||
    ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)
  ))
    throw new Error('Production API требует публичный HTTPS URL.');
  return `${url.origin}/api`;
}

export function joinApiPath(base, path) {
  if (typeof path !== 'string' || !path.startsWith('/') || path.startsWith('//'))
    throw new Error('API path должен начинаться с одного / и не содержать origin.');
  const suffix = path.replace(/^\/api(?=\/|\?|$)/, '');
  return `${base}${suffix}`;
}
