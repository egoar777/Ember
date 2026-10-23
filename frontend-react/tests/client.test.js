import test from 'node:test';
import assert from 'node:assert/strict';
import { apiGet, apiPost, apiUpload, getAuth, setAuth, clearAuth } from '../src/api/client.js';

const storage = new Map();
globalThis.localStorage = {
  getItem: (key) => storage.get(key) ?? null,
  setItem: (key, value) => storage.set(key, String(value)),
  removeItem: (key) => storage.delete(key),
};

test('damaged stored profile does not prevent startup', () => {
  storage.set('user', '{broken');
  assert.equal(getAuth().user, null);
  assert.equal(storage.has('user'), false);
});

test('successful empty API responses return null', async () => {
  globalThis.fetch = async () => new Response(null, { status: 200 });
  assert.equal(await apiPost('/auth/logout', {}), null);
});

test('parallel unauthorized requests share one token refresh', async () => {
  setAuth({ token: 'old', refreshToken: 'refresh', user: { id: 1 } });
  let refreshes = 0;
  globalThis.fetch = async (url, options) => {
    if (url.endsWith('/auth/refresh')) {
      refreshes++;
      await new Promise((resolve) => setTimeout(resolve, 10));
      return Response.json({ token: 'new', refreshToken: 'next', user: { id: 1 } });
    }
    return options.headers.Authorization === 'Bearer new'
      ? Response.json({ ok: true }) : new Response(null, { status: 401 });
  };
  const results = await Promise.all([apiGet('/one'), apiGet('/two')]);
  assert.equal(refreshes, 1);
  assert.ok(results.every((result) => result.ok));
});

test('multipart uploads keep browser-generated content type and guest credentials', async () => {
  clearAuth();
  globalThis.fetch = async (_url, options) => {
    assert.equal(options.credentials, 'include');
    assert.equal(options.headers['Content-Type'], undefined);
    assert.ok(options.body instanceof FormData);
    return Response.json({ url: '/uploads/image.png' });
  };
  assert.equal((await apiUpload('/upload', new FormData())).url, '/uploads/image.png');
});

test('temporary refresh failures preserve the current session', async () => {
  setAuth({ token: 'old', refreshToken: 'refresh' });
  globalThis.fetch = async (url) => new Response(null, { status: url.endsWith('/auth/refresh') ? 503 : 401 });
  await assert.rejects(apiGet('/profile'));
  assert.equal(getAuth().token, 'old');
});
