import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeVoiceSearchQuery } from '../src/utils/searchQuery.js';
import { safeReturnPath, consumeGoogleAuthState } from '../src/utils/googleAuth.js';

test('voice commands retain the movie title', () => {
  assert.equal(normalizeVoiceSearchQuery('  найди фильм   Аватар  '), 'Аватар');
});

test('redirect destinations stay within the application', () => {
  assert.equal(safeReturnPath('/profile/tickets'), '/profile/tickets');
  assert.equal(safeReturnPath('//example.com'), '/');
  assert.equal(safeReturnPath('https://example.com'), '/');
  assert.equal(safeReturnPath('/\\example.com'), '/');
});

test('Google OAuth state is bound to the browser and consumed once', () => {
  const values = new Map();
  globalThis.sessionStorage = {
    getItem: (key) => values.get(key) ?? null,
    removeItem: (key) => values.delete(key),
  };
  values.set('ember_google_state', JSON.stringify({ nonce: 'nonce', returnPath: '/profile', createdAt: Date.now() }));
  assert.equal(consumeGoogleAuthState('nonce'), '/profile');
  assert.throws(() => consumeGoogleAuthState('nonce'));
  values.set('ember_google_state', JSON.stringify({ nonce: 'right', returnPath: '/', createdAt: Date.now() }));
  assert.throws(() => consumeGoogleAuthState('wrong'));
});
