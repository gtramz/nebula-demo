import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { fixture } from './test-fixtures.mjs';

test('publication retries preserve one write and keep legacy revision checks', async t => {
  const app = await fixture(t), artist = app.client(); await artist.register('HandoffPublisher');
  const media = await (await artist.upload()).json();
  const input = { operationId: randomUUID(), title: 'One publication', description: '', mediaId: media.id, coverId: null, projectId: null, allowRemix: false, status: 'draft' };
  const first = await artist.request('/api/publications', 'POST', input); assert.equal(first.status, 201);
  const saved = await first.json(), repeated = await artist.request('/api/publications', 'POST', input);
  assert.equal(repeated.status, 201); assert.equal((await repeated.json()).id, saved.id);
  assert.equal((await artist.request('/api/publications?mine=1').then(r => r.json())).items.filter(p => p.title === input.title).length, 1);
  assert.equal((await artist.request('/api/publications', 'POST', { ...input, title: 'Different' })).status, 409);
  const update = { ...input, operationId: randomUUID(), title: 'Published once', status: 'published', revision: saved.revision };
  const path = `/api/publications/${saved.id}`;
  const changed = await artist.request(path, 'PATCH', update); assert.equal(changed.status, 200);
  const replay = await artist.request(path, 'PATCH', update); assert.equal(replay.status, 200);
  assert.equal((await replay.json()).revision, saved.revision + 1);
  const { operationId, ...legacy } = update;
  assert.equal((await artist.request(path, 'PATCH', legacy)).status, 409);
  const invalid = { ...input, operationId: randomUUID(), title: '' };
  assert.equal((await artist.request('/api/publications', 'POST', invalid)).status, 400);
  assert.equal((await artist.request('/api/publications', 'POST', { ...invalid, title: 'Recovered' })).status, 201);
});
