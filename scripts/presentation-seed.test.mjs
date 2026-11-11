import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { pbkdf2Sync } from 'node:crypto';
import { preparePresentation } from './presentation-seed.mjs';

test('portable fixture excludes credentials and sessions, installs all media and preserves later edits', async () => {
  const root = await mkdtemp(join(tmpdir(), 'nebula-portable-seed-'));
  const destination = join(root, 'presentation');
  try {
    const fixture = new DatabaseSync(resolve('presentation/seed/scene.sqlite'), { readOnly: true });
    const baseline = JSON.parse(fixture.prepare('SELECT value FROM state').get().value);
    assert.equal(baseline.accounts.length, 12);
    assert(baseline.accounts.every(a => !a.salt && !a.passwordDigest && a.email.endsWith('@nebula.local')));
    assert.equal(fixture.prepare('SELECT count(*) AS n FROM sessions').get().n, 0);
    fixture.close();
    assert.equal(await preparePresentation(destination), true);
    const db = new DatabaseSync(join(destination, 'nebula.sqlite'));
    const state = JSON.parse(db.prepare('SELECT value FROM state').get().value);
    assert.deepEqual(state.projects, baseline.projects);
    assert.deepEqual(state.artists, baseline.artists);
    assert.equal(db.prepare('SELECT count(*) AS n FROM posts').get().n, JSON.parse(await readFile('presentation/seed/manifest.json', 'utf8')).counts.posts);
    const principal = state.accounts.find(a => a.id === 19);
    assert.equal(principal.passwordDigest, pbkdf2Sync('Nebula2026!', principal.salt, 600_000, 32, 'sha256').toString('hex'));
    const manifest = JSON.parse(await readFile('presentation/seed/manifest.json', 'utf8'));
    for (const item of manifest.media) assert((await readFile(join(destination, 'media', item.id))).length > 0);
    for (const item of manifest.prepared) assert((await readFile(join(destination, 'prepared', item.name))).length > 0);
    state.artists.find(a => a.id === 19).bio = 'A deliberate local edit';
    db.prepare('UPDATE state SET value=?').run(JSON.stringify(state)); db.close();
    assert.equal(await preparePresentation(destination), false);
    const reloaded = new DatabaseSync(join(destination, 'nebula.sqlite'), { readOnly: true });
    assert.equal(JSON.parse(reloaded.prepare('SELECT value FROM state').get().value).artists.find(a => a.id === 19).bio, 'A deliberate local edit');
    reloaded.close();
    const initial = new DatabaseSync(join(destination, 'initial.sqlite'), { readOnly: true });
    assert.deepEqual(JSON.parse(initial.prepare('SELECT value FROM state').get().value).artists, baseline.artists); initial.close();
    await mkdir(join(root, 'incomplete'));
    await assert.rejects(() => preparePresentation(join(root, 'incomplete')), /incomplete/);
  } finally { await rm(root, { recursive: true, force: true }); }
});
