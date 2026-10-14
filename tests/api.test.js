import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { transformWithEsbuild } from 'vite';
import { joinApiPath, resolveApiBase } from '../src/services/api-url.js';

test('development proxy and absolute backend origins preserve API paths once', () => {
  assert.equal(resolveApiBase(''), '/api');
  assert.equal(resolveApiBase('/api/'), '/api');
  for (const value of ['https://backend.example.test', 'https://backend.example.test/api/']) {
    const base = resolveApiBase(value, { production: true });
    assert.equal(joinApiPath(base, '/auth/me'), 'https://backend.example.test/api/auth/me');
    assert.equal(joinApiPath(base, '/api/auth/me'), 'https://backend.example.test/api/auth/me');
    assert.equal(joinApiPath(base, '/api/users/me?page=2'), 'https://backend.example.test/api/users/me?page=2');
  }
});

test('production cannot silently use development endpoints or an unset backend', () => {
  for (const value of ['', '/api', 'http://backend.example.test', 'https://localhost:4000', 'https://127.0.0.1:4000'])
    assert.throws(() => resolveApiBase(value, { production: true }));
  for (const value of ['https://user:password@backend.example.test', 'https://backend.example.test/api/api', 'https://backend.example.test?token=x'])
    assert.throws(() => resolveApiBase(value));
  assert.throws(() => joinApiPath('/api', '//evil.example.test/auth/me'));
});

async function client(value, production) {
  const file = new URL('../src/services/api.js', import.meta.url);
  const helper = new URL('../src/services/api-url.js', import.meta.url).href;
  const source = (await fs.readFile(file, 'utf8')).replace("'./api-url.js'", JSON.stringify(helper));
  const { code } = await transformWithEsbuild(source, 'api.js', {
    format: 'esm',
    define: { 'import.meta.env': JSON.stringify({ VITE_API_URL: value, PROD: production }) },
  });
  return import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`);
}

test('client sends CSRF, JSON, file uploads and cookies to the configured backend', async () => {
  const original = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (url, options) => {
    calls.push({ url, options });
    return new Response(JSON.stringify(url.endsWith('/auth/csrf') ? { token: 'csrf-test-token' } : { ok: true }), {
      headers: { 'Content-Type': 'application/json' },
    });
  };
  try {
    const api = await client('https://backend.example.test/api/', true);
    await api.api('/auth/login', { method: 'POST', body: { email: 'test@example.test', password: 'test-only' } });
    await api.api('/users/me');
    const file = new FormData();
    file.append('image', new Blob(['test'], { type: 'image/png' }), 'test.png');
    await api.api('/uploads', { method: 'POST', body: file, credentials: 'omit' });
    assert.deepEqual(calls.map((call) => call.url), [
      'https://backend.example.test/api/auth/csrf',
      'https://backend.example.test/api/auth/login',
      'https://backend.example.test/api/users/me',
      'https://backend.example.test/api/uploads',
    ]);
    assert.ok(calls.every((call) => call.options.credentials === 'include'));
    assert.equal(calls[1].options.headers['X-CSRF-Token'], 'csrf-test-token');
    assert.equal(calls[1].options.headers['Content-Type'], 'application/json');
    assert.equal(calls[3].options.body, file);
    assert.equal(calls[3].options.headers['Content-Type'], undefined);
    const local = await client('/api', false);
    await local.api('/auth/me');
    assert.equal(calls.at(-1).url, '/api/auth/me');
    const missing = await client('', true);
    const before = calls.length;
    await assert.rejects(missing.api('/auth/me'), /VITE_API_URL/);
    assert.equal(calls.length, before);
  } finally {
    globalThis.fetch = original;
  }
});
