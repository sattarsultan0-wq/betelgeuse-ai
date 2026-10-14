import test from 'node:test';
import assert from 'node:assert/strict';
import { createVercelConfig } from '../scripts/vercel-config.js';

test('same-origin proxy keeps API, OAuth callback, SPA routes and cache boundaries', () => {
  const config = createVercelConfig('https://backend-example.onrender.com/');
  assert.deepEqual(config.rewrites[0], {
    source: '/api/:path*',
    destination: 'https://backend-example.onrender.com/api/:path*',
  });
  const spa = new RegExp(`^${config.rewrites[1].source}$`);
  assert.ok(spa.test('/workflow'));
  for (const path of [
    '/api',
    '/api/auth/csrf',
    '/api/auth/oauth/google/callback',
    '/assets/test.js',
  ])
    assert.equal(spa.test(path), false);
  const apiHeaders = config.headers.find((rule) => rule.source === '/api/:path*').headers;
  assert.ok(apiHeaders.every((header) => header.value.includes('no-store')));
  assert.ok(config.headers.find((rule) => rule.source === '/assets/(.*)'));
});

test('proxy fails closed without a trusted fixed Render destination', () => {
  for (const value of [
    undefined,
    '',
    'http://backend-example.onrender.com',
    'https://evil.test',
    'https://backend-example.onrender.com/api',
    'https://user:password@backend-example.onrender.com',
    'https://backend-example.onrender.com?redirect=x',
    'https://backend-example.onrender.com.evil.test',
  ])
    assert.throws(() => createVercelConfig(value));
});
