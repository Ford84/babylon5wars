import test from 'node:test';
import assert from 'node:assert/strict';
import app from '../worker/index.mjs';

test('RPG health endpoint announces isolated engine', async () => {
  const r = await app.fetch(new Request('https://example.test/api/health'), {DB:{}});
  assert.equal(r.status, 200);
  const v = await r.json();
  assert.equal(v.app, 'babylon5rpg-combat');
  assert.equal(v.engine, 'rpg2e-quick-subset-0.1');
});

test('Login screen is served without accessing game data', async () => {
  const r = await app.fetch(new Request('https://example.test/'), {DB:{}});
  assert.equal(r.status, 200);
  assert.match(await r.text(), /Sign in or register/);
  assert.match(r.headers.get('content-type'), /text\/html/);
});

test('Private routes reject unauthenticated users', async () => {
  const r = await app.fetch(new Request('https://example.test/api/me'), {DB:{}});
  assert.equal(r.status, 401);
});

test('Cross-origin writes are forbidden', async () => {
  const r = await app.fetch(new Request('https://example.test/api/register', {method:'POST',headers:{origin:'https://other.test'}}), {DB:{}});
  assert.equal(r.status,403);
});
