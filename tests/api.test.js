import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { transformWithEsbuild } from 'vite';
import { joinApiPath, resolveApiBase } from '../src/services/api-url.js';

test('development proxy and absolute backend origins preserve API paths once', () => {
  assert.equal(resolveApiBase(''), '/api');
  assert.equal(resolveApiBase('/api/'), '/api');
  for (const value of [
    'https://backend.example.test',
    'https://backend.example.test/api/',
  ]) {
    const base = resolveApiBase(value, { production: true });
    assert.equal(
      joinApiPath(base, '/auth/me'),
      'https://backend.example.test/api/auth/me',
    );
    assert.equal(
      joinApiPath(base, '/api/auth/me'),
      'https://backend.example.test/api/auth/me',
    );
    assert.equal(
      joinApiPath(base, '/api/users/me?page=2'),
      'https://backend.example.test/api/users/me?page=2',
    );
  }
});

test('production supports the first-party proxy and rejects insecure direct endpoints', () => {
  assert.equal(resolveApiBase('/api', { production: true }), '/api');
  for (const value of [
    '',
    'http://backend.example.test',
    'https://localhost:4000',
    'https://127.0.0.1:4000',
  ])
    assert.throws(() => resolveApiBase(value, { production: true }));
  for (const value of [
    'https://user:password@backend.example.test',
    'https://backend.example.test/api/api',
    'https://backend.example.test?token=x',
  ])
    assert.throws(() => resolveApiBase(value));
  assert.throws(() => joinApiPath('/api', '//evil.example.test/auth/me'));
});

let clientId = 0;
async function client(value, production) {
  const file = new URL('../src/services/api.js', import.meta.url);
  const helper = new URL('../src/services/api-url.js', import.meta.url).href;
  const source = (await fs.readFile(file, 'utf8')).replace(
    "'./api-url.js'",
    JSON.stringify(helper),
  );
  const { code } = await transformWithEsbuild(source, 'api.js', {
    format: 'esm',
    define: {
      'import.meta.env': JSON.stringify({ VITE_API_URL: value, PROD: production }),
    },
  });
  return import(
    `data:text/javascript;base64,${Buffer.from(`${code}\n// isolated client ${clientId++}`).toString('base64')}`
  );
}

test('client sends CSRF, JSON, file uploads and cookies to the configured backend', async () => {
  const original = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (url, options) => {
    calls.push({ url, options });
    return new Response(
      JSON.stringify(
        url.endsWith('/auth/csrf') ? { token: 'a'.repeat(64) } : { ok: true },
      ),
      {
        headers: { 'Content-Type': 'application/json' },
      },
    );
  };
  try {
    const api = await client('https://backend.example.test/api/', true);
    await api.api('/auth/login', {
      method: 'POST',
      body: { email: 'test@example.test', password: 'test-only' },
    });
    await api.api('/users/me');
    const file = new FormData();
    file.append('image', new Blob(['test'], { type: 'image/png' }), 'test.png');
    await api.api('/uploads', { method: 'POST', body: file, credentials: 'omit' });
    assert.deepEqual(
      calls.map((call) => call.url),
      [
        'https://backend.example.test/api/auth/csrf',
        'https://backend.example.test/api/auth/csrf/check',
        'https://backend.example.test/api/auth/login',
        'https://backend.example.test/api/users/me',
        'https://backend.example.test/api/uploads',
      ],
    );
    assert.ok(calls.every((call) => call.options.credentials === 'include'));
    assert.equal(calls[2].options.headers['X-CSRF-Token'], 'a'.repeat(64));
    assert.equal(calls[2].options.headers['Content-Type'], 'application/json');
    assert.equal(calls[4].options.body, file);
    assert.equal(calls[4].options.headers['Content-Type'], undefined);
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

const json = (data, status = 200) => new Response(JSON.stringify(data), { status });

test('blocked cookies stop login before any mutation and expose an actionable error', async () => {
  const original = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (url) => {
    calls.push(url);
    if (url.endsWith('/csrf')) return json({ token: 'a'.repeat(64) });
    if (url.endsWith('/csrf/check'))
      return json({ code: 'CSRF', reason: 'COOKIE_MISSING' }, 403);
    assert.fail('A blocked cookie must not reach login');
  };
  try {
    const { api } = await client('/api', true);
    await assert.rejects(
      api('/auth/login', { method: 'POST', body: { email: 'test@example.test' } }),
      (error) => error.code === 'CSRF_COOKIE_UNAVAILABLE' && error.status === 403,
    );
    assert.deepEqual(calls, ['/api/auth/csrf', '/api/auth/csrf/check']);
  } finally {
    globalThis.fetch = original;
  }
});

test('one stale-token rejection refreshes CSRF and preserves body and idempotency key', async () => {
  const original = globalThis.fetch;
  const calls = [];
  let issued = 0,
    mutations = 0;
  globalThis.fetch = async (url, options) => {
    calls.push({ url, ...options, headers: { ...options.headers } });
    if (url.endsWith('/csrf'))
      return json({ token: (++issued === 1 ? 'a' : 'b').repeat(64) });
    if (url.endsWith('/csrf/check')) return json({ ok: true });
    return ++mutations === 1
      ? json({ code: 'CSRF', reason: 'TOKEN_MISMATCH' }, 403)
      : json({ generation: { id: 'test-result' } });
  };
  try {
    const { api } = await client('/api', true);
    const body = { prompt: 'A scene' };
    const result = await api('/generations', {
      method: 'post',
      body,
      headers: { 'Idempotency-Key': 'same-request' },
    });
    const posts = calls.filter((call) => call.method === 'POST');
    assert.equal(result.generation.id, 'test-result');
    assert.equal(posts.length, 2);
    assert.equal(posts[0].headers['X-CSRF-Token'], 'a'.repeat(64));
    assert.equal(posts[1].headers['X-CSRF-Token'], 'b'.repeat(64));
    assert.ok(
      posts.every(
        (call) =>
          call.headers['Idempotency-Key'] === 'same-request' &&
          call.body === JSON.stringify(body),
      ),
    );
    assert.ok(
      calls.every((call) => call.cache === 'no-store' && call.credentials === 'include'),
    );
  } finally {
    globalThis.fetch = original;
  }
});

test('concurrent mutations share token acquisition and verification', async () => {
  const original = globalThis.fetch;
  let issued = 0,
    checked = 0,
    mutations = 0;
  globalThis.fetch = async (url) => {
    if (url.endsWith('/csrf')) {
      issued++;
      return json({ token: 'a'.repeat(64) });
    }
    if (url.endsWith('/csrf/check')) {
      checked++;
      return json({ ok: true });
    }
    mutations++;
    return json({ ok: true });
  };
  try {
    const { api } = await client('/api', true);
    await Promise.all([
      api('/uploads', { method: 'POST' }),
      api('/generations', { method: 'POST' }),
    ]);
    assert.deepEqual(
      { issued, checked, mutations },
      { issued: 1, checked: 1, mutations: 2 },
    );
  } finally {
    globalThis.fetch = original;
  }
});

test('persistent CSRF failure is bounded and authentication/server/origin failures are never retried', async () => {
  const original = globalThis.fetch;
  try {
    for (const [status, data, expected] of [
      [403, { code: 'CSRF', reason: 'TOKEN_MISMATCH' }, 2],
      [403, { code: 'CSRF', reason: 'ORIGIN' }, 1],
      [403, { code: 'REQUEST_ERROR' }, 1],
      [401, { code: 'UNAUTHORIZED' }, 1],
      [500, { code: 'INTERNAL' }, 1],
    ]) {
      let mutations = 0;
      globalThis.fetch = async (url) => {
        if (url.endsWith('/csrf')) return json({ token: 'a'.repeat(64) });
        if (url.endsWith('/csrf/check')) return json({ ok: true });
        mutations++;
        return json(data, status);
      };
      const { api } = await client('/api', true);
      await assert.rejects(
        api('/auth/login', { method: 'POST' }),
        (error) => error.status === status && error.code === data.code,
      );
      assert.equal(mutations, expected);
    }
    let calls = 0;
    globalThis.fetch = async () => {
      calls++;
      throw new TypeError('network failed');
    };
    const { api } = await client('/api', true);
    await assert.rejects(api('/auth/login', { method: 'POST' }), /API недоступен/);
    assert.equal(calls, 1);
  } finally {
    globalThis.fetch = original;
  }
});

test('initial multi-tab cookie race can recheck once without submitting a mutation early', async () => {
  const original = globalThis.fetch;
  let issued = 0,
    checked = 0,
    mutations = 0;
  globalThis.fetch = async (url) => {
    if (url.endsWith('/csrf'))
      return json({ token: (++issued === 1 ? 'a' : 'b').repeat(64) });
    if (url.endsWith('/csrf/check'))
      return ++checked === 1
        ? json({ code: 'CSRF', reason: 'TOKEN_MISMATCH' }, 403)
        : json({ ok: true });
    mutations++;
    return json({ ok: true });
  };
  try {
    const { api } = await client('/api', true);
    await api('/auth/login', { method: 'POST' });
    assert.deepEqual(
      { issued, checked, mutations },
      { issued: 2, checked: 2, mutations: 1 },
    );
  } finally {
    globalThis.fetch = original;
  }
});
