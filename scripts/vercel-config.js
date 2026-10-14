// Runs at deploy time, not in the browser. The destination is never user-controlled.
export function createVercelConfig(value) {
  let backend;
  try {
    backend = new URL(value);
  } catch {
    throw new Error(
      'Set BACKEND_ORIGIN in Vercel to the real HTTPS Render origin before deploying.',
    );
  }
  if (
    backend.protocol !== 'https:' ||
    backend.username ||
    backend.password ||
    backend.search ||
    backend.hash ||
    backend.pathname !== '/' ||
    !backend.hostname.endsWith('.onrender.com')
  )
    throw new Error(
      'BACKEND_ORIGIN must be the real HTTPS onrender.com origin without a path or credentials.',
    );
  return {
    rewrites: [
      { source: '/api/:path*', destination: `${backend.origin}/api/:path*` },
      {
        source: '/((?!api(?:/|$)|images/|videos/|assets/).*)',
        destination: '/index.html',
      },
    ],
    headers: [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Cache-Control', value: 'private, no-store' },
          { key: 'CDN-Cache-Control', value: 'no-store' },
          { key: 'Vercel-CDN-Cache-Control', value: 'no-store' },
        ],
      },
      {
        source: '/assets/(.*)',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }],
      },
    ],
  };
}
