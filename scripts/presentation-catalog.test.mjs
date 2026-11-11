import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { copyFile, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { installChilzCatalog } from './presentation-catalog.mjs';

test('catalog upgrade is additive, idempotent, credential-safe and keeps Sol available', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'nebula-catalog-'));
  const path = join(dir, 'fixture.sqlite'); let db;
  try {
    await copyFile('presentation/seed/scene.sqlite', path); db = new DatabaseSync(path);
    const installed = JSON.parse(db.prepare("SELECT value FROM presentation_settings WHERE key='artist-catalog'").get().value);
    const state = JSON.parse(db.prepare('SELECT value FROM state').get().value);
    // Reconstruct the previous fixture in this disposable copy only.
    const lunaRow = db.prepare("SELECT value FROM presentation_settings WHERE key='luna-example'").get();
    if (lunaRow) {
      const luna = JSON.parse(lunaRow.value), identities = new Set(luna.accounts.map(a=>a.id));
      state.accounts = state.accounts.filter(a=>!identities.has(a.id));
      state.artists = state.artists.filter(a=>!identities.has(a.id));
      state.projects = state.projects.filter(p=>![luna.original.projectId,luna.remix.projectId].includes(p.id));
      for (const song of [luna.original,luna.remix]) {
        db.prepare('DELETE FROM posts WHERE id=?').run(song.postId);
        db.prepare('DELETE FROM media WHERE id IN (?,?)').run(song.mediaId,song.coverId);
        db.prepare('DELETE FROM project_works WHERE project=?').run(song.projectId);
        db.prepare('DELETE FROM project_tracklists WHERE project=?').run(song.projectId);
        db.prepare('DELETE FROM works WHERE id=?').run(song.workId);
      }
      db.prepare("DELETE FROM presentation_settings WHERE key='luna-example'").run();
    }
    state.accounts = state.accounts.filter(a => a.id !== installed.artistId);
    state.artists = state.artists.filter(a => a.id !== installed.artistId);
    state.projects = state.projects.filter(p => p.artistId !== installed.artistId);
    for (const release of installed.releases) { db.prepare('DELETE FROM project_works WHERE project=?').run(release.projectId); db.prepare('DELETE FROM project_tracklists WHERE project=?').run(release.projectId); }
    db.prepare('DELETE FROM works WHERE owner=?').run(installed.artistId);
    db.prepare("DELETE FROM presentation_settings WHERE key='artist-catalog'").run();
    const scene = JSON.parse(db.prepare("SELECT value FROM presentation_settings WHERE key='scenario'").get().value); scene.principalId = 19; scene.personas = [];
    db.prepare("UPDATE presentation_settings SET value=? WHERE key='scenario'").run(JSON.stringify(scene));
    state.artists.find(a => a.id === 19).bio = 'Preserve my deliberate rehearsal edit';
    db.prepare('UPDATE state SET value=?').run(JSON.stringify(state));
    const stable = ['posts', 'media', 'sessions', 'collaborations', 'collaboration_messages', 'collaboration_files', 'artist_follows', 'artist_notifications'];
    const before = Object.fromEntries(stable.map(t => [t, db.prepare(`SELECT * FROM ${t}`).all()]));
    const result = installChilzCatalog(db, { credentials: 'redacted' }); assert.equal(result.changed, true);
    const after = JSON.parse(db.prepare('SELECT value FROM state').get().value);
    assert.deepEqual(after.accounts.filter(a => a.id !== result.catalog.artistId), state.accounts);
    assert.deepEqual(after.artists.filter(a => a.id !== result.catalog.artistId), state.artists);
    assert.deepEqual(after.projects.filter(p => p.artistId !== result.catalog.artistId), state.projects);
    assert(stable.every(t => JSON.stringify(db.prepare(`SELECT * FROM ${t}`).all()) === JSON.stringify(before[t])));
    assert.equal(result.catalog.releases.length, 10); assert.equal(result.catalog.releases.flatMap(r => r.tracks).length, 14);
    assert(after.projects.filter(p => p.artistId === result.catalog.artistId).every(p => p.status === 'published' && p.goalAmount === 0 && p.useOfFunds.length === 0));
    assert(after.accounts.every(a => !a.passwordDigest && !a.salt));
    const nextScene = JSON.parse(db.prepare("SELECT value FROM presentation_settings WHERE key='scenario'").get().value);
    assert(nextScene.personas.some(a => a.id === 19)); assert.equal(nextScene.principalId, result.catalog.artistId);
    const saved = db.prepare('SELECT value FROM state').get().value;
    assert.equal(installChilzCatalog(db).changed, false); assert.equal(db.prepare('SELECT value FROM state').get().value, saved);
  } finally { db?.close(); await rm(dir, {recursive:true, force:true}); }
});
