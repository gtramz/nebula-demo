import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { createHash, pbkdf2Sync } from 'node:crypto';
import { mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { installLunaExample } from './presentation-luna.mjs';

function fixture() {
  const db = new DatabaseSync(':memory:');
  db.exec(`CREATE TABLE state(id INTEGER PRIMARY KEY,value TEXT NOT NULL);
    CREATE TABLE presentation_settings(key TEXT PRIMARY KEY,value TEXT NOT NULL);
    CREATE TABLE works(id INTEGER PRIMARY KEY AUTOINCREMENT,owner INTEGER NOT NULL,title TEXT NOT NULL,description TEXT NOT NULL,revision INTEGER NOT NULL DEFAULT 1,created TEXT NOT NULL,updated TEXT NOT NULL);
    CREATE TABLE project_works(project INTEGER NOT NULL,work INTEGER NOT NULL,position INTEGER NOT NULL,PRIMARY KEY(project,work),UNIQUE(project,position));
    CREATE TABLE project_tracklists(project INTEGER PRIMARY KEY,revision INTEGER NOT NULL DEFAULT 0);
    CREATE TABLE posts(id INTEGER PRIMARY KEY AUTOINCREMENT,owner INTEGER NOT NULL,data TEXT NOT NULL,revision INTEGER NOT NULL DEFAULT 1,created TEXT NOT NULL,updated TEXT NOT NULL);
    CREATE TABLE media(id TEXT PRIMARY KEY,owner INTEGER NOT NULL,kind TEXT NOT NULL,mime TEXT NOT NULL,size INTEGER NOT NULL,created INTEGER NOT NULL,name TEXT);
    CREATE TABLE unrelated_history(id INTEGER PRIMARY KEY,content TEXT NOT NULL); INSERT INTO unrelated_history VALUES(8,'Preserve the rehearsal exactly');`);
  const state = { version: 1, nextId: 99, currentAccountId: 19,
    accounts: [{ id: 19, name: 'Sol Rivera', email: 'sol.rivera@nebula.local', role: 'artist', passwordDigest: 'untouched', salt: 'untouched' },
      { id: 42, name: 'CHILZ', email: 'chilz@nebula.local', role: 'artist' }],
    artists: [{ id: 19, name: 'Sol Rivera', bio: 'My edited biography' }, { id: 42, name: 'CHILZ' }],
    projects: [{ id: 74, artistId: 19, title: 'Preserve my project', category: 'Album', currency: 'USD', goalAmount: 100 }],
    investments: [{ id: 77, amount: 5 }], supports: [], visibility: {}, authEvents: [{ id: 9, event: 'existing' }] };
  const scene = { version: 1, principalId: 42, actors: [{ id: 19, name: 'Sol Rivera', needs: ['Mix'] }], personas: [{ id: 7, name: 'Existing persona', role: 'investor' }], pairs: [{ sourceId: 5, contributionPath: 'preserved.wav' }] };
  db.prepare('INSERT INTO state VALUES(1,?)').run(JSON.stringify(state));
  db.prepare('INSERT INTO presentation_settings VALUES(?,?)').run('artist-catalog', JSON.stringify({ version: 1, artistId: 42, releases: [] }));
  db.prepare('INSERT INTO presentation_settings VALUES(?,?)').run('scenario', JSON.stringify(scene));
  db.exec("INSERT INTO works(id,owner,title,description,created,updated) VALUES(12,19,'Existing work','Keep this','2025-01-01','2025-01-02'); INSERT INTO project_works VALUES(74,12,0); INSERT INTO project_tracklists VALUES(74,3); INSERT INTO posts(id,owner,data,created,updated) VALUES(8,19,'{\"title\":\"My upload\"}','2025-01-01','2025-01-02'); INSERT INTO media VALUES('old-upload',19,'audio','audio/mpeg',100,1,'keep.mp3');");
  return db;
}
const stateOf = db => JSON.parse(db.prepare('SELECT value FROM state').get().value);
const sceneOf = db => JSON.parse(db.prepare("SELECT value FROM presentation_settings WHERE key='scenario'").get().value);
const snapshot = db => Object.fromEntries(db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all().map(({ name }) => [name, db.prepare(`SELECT * FROM ${name}`).all()]));

test('LUNA adds mapped demo artists, one shared original and an attributed full-song remix without changing existing records', () => {
  const db = fixture();
  try {
    const state = stateOf(db), scene = sceneOf(db), before = snapshot(db);
    const result = installLunaExample(db, { credentials: 'redacted' });
    const { original, remix, accounts } = result.example;
    assert.equal(result.changed, true); assert.deepEqual(accounts.map(a => a.name), ['gramz', 'SANNFERNNA']);
    assert.deepEqual(original.artistIds, accounts.map(a => a.id)); assert.deepEqual(remix.artistIds, [42]);
    assert.equal(original.durationSeconds, 175.287438); assert.equal(remix.durationSeconds, original.durationSeconds);
    const after = stateOf(db);
    assert.deepEqual(after.accounts.slice(0, 2), state.accounts); assert.deepEqual(after.artists.slice(0, 2), state.artists); assert.deepEqual(after.projects.slice(0, 1), state.projects);
    for (const key of ['currentAccountId', 'investments', 'supports', 'visibility', 'authEvents']) assert.deepEqual(after[key], state[key]);
    assert(after.accounts.slice(2).every(a => !a.passwordDigest && !a.salt));
    assert(after.artists.slice(2).every(a => a.picture.startsWith('data:image/png;base64,')));
    assert.deepEqual(after.projects.slice(1).map(p => p.presentationCatalogId), ['local:luna-original', 'local:luna-chilz-remix']);
    assert(after.projects.slice(1).every(p => p.goalAmount === 0 && p.currency === 'USD' && p.useOfFunds.length === 0 && p.status === 'published'));
    assert.equal(db.prepare('SELECT COUNT(*) AS n FROM works').get().n, 3);
    assert.equal(db.prepare('SELECT COUNT(*) AS n FROM posts').get().n, 3);
    const sourceRow = db.prepare('SELECT * FROM posts WHERE id=?').get(original.postId);
    const remixRow = db.prepare('SELECT * FROM posts WHERE id=?').get(remix.postId);
    const source = JSON.parse(sourceRow.data), derivative = JSON.parse(remixRow.data);
    assert.equal(sourceRow.owner, accounts[0].id); assert.equal(remixRow.owner, 42);
    assert.equal(source.mediaId, original.mediaId); assert.equal(source.remix, null); assert.equal(source.allowRemix, true);
    assert.equal(derivative.allowRemix, false); assert.equal(derivative.remix.sourceId, original.postId);
    assert.equal(derivative.remix.sourceMediaId, original.mediaId); assert.equal(derivative.remix.artistId, accounts[0].id);
    assert.equal(derivative.remix.endSeconds, 175.287438); assert.equal(derivative.workId, remix.workId);
    assert.equal(db.prepare('SELECT owner FROM works WHERE id=?').get(original.workId).owner, accounts[0].id);
    assert.equal(db.prepare('SELECT COUNT(*) AS n FROM works WHERE owner=?').get(accounts[1].id).n, 0);
    assert.equal(sceneOf(db).principalId, scene.principalId); assert.deepEqual(sceneOf(db).actors, scene.actors); assert.deepEqual(sceneOf(db).pairs, scene.pairs);
    assert.deepEqual(sceneOf(db).personas.slice(0, 1), scene.personas); assert.equal(sceneOf(db).personas.length, 3);
    for (const table of ['posts', 'media', 'works', 'project_works', 'project_tracklists', 'unrelated_history']) assert.deepEqual(db.prepare(`SELECT * FROM ${table}`).all().slice(0, before[table].length), before[table]);
    const completed = snapshot(db);
    assert.equal(installLunaExample(db).changed, false); assert.deepEqual(snapshot(db), completed);
    assert.deepEqual(installLunaExample(db).media, result.media);
  } finally { db.close(); }
});

test('LUNA copies only registered immutable assets and generates credentials only for the new accounts', () => {
  const db = fixture(), dir = mkdtempSync(join(tmpdir(), 'nebula-luna-files-'));
  try {
    writeFileSync(join(dir, 'existing-upload'), 'unchanged');
    const before = stateOf(db).accounts;
    const result = installLunaExample(db, { mediaDirectory: dir });
    assert.deepEqual(stateOf(db).accounts.slice(0, 2), before);
    const newAccounts = stateOf(db).accounts.slice(2);
    assert.notEqual(newAccounts[0].salt, newAccounts[1].salt);
    for (const a of newAccounts) assert.equal(a.passwordDigest, pbkdf2Sync('Nebula2026!', a.salt, 600_000, 32, 'sha256').toString('hex'));
    assert.equal(result.media.length, 4);
    for (const file of result.media) {
      const bytes = readFileSync(join(dir, file.id));
      assert.equal(bytes.length, file.size); assert.equal(createHash('sha256').update(bytes).digest('hex'), file.sha256);
      if (file.kind === 'audio') { assert.equal(file.mime, 'audio/mp4'); assert.equal(bytes.toString('ascii', 4, 8), 'ftyp'); }
      assert.equal(db.prepare('SELECT size FROM media WHERE id=?').get(file.id).size, file.size);
    }
    assert.equal(readFileSync(join(dir, 'existing-upload'), 'utf8'), 'unchanged');
    assert.equal(readdirSync(dir).length, 5);
  } finally { db.close(); rmSync(dir, { recursive: true, force: true }); }
});

test('insertion failure rolls back every database record, sequence and newly copied file', () => {
  const db = fixture(), dir = mkdtempSync(join(tmpdir(), 'nebula-luna-rollback-'));
  try {
    writeFileSync(join(dir, 'existing-upload'), 'keep');
    db.exec("CREATE TRIGGER fail_luna BEFORE INSERT ON posts BEGIN SELECT RAISE(ABORT,'simulated post failure'); END;");
    const before = snapshot(db);
    assert.throws(() => installLunaExample(db, { credentials: 'redacted', mediaDirectory: dir }), /simulated post failure/);
    assert.deepEqual(snapshot(db), before); assert.deepEqual(readdirSync(dir), ['existing-upload']);
  } finally { db.close(); rmSync(dir, { recursive: true, force: true }); }
});

test('conflicting demo identity or missing CHILZ mapping refuses the import without replacing any account', () => {
  const db = fixture();
  try {
    const state = stateOf(db); state.accounts[0].email = 'gramz.demo@nebula.local';
    db.prepare('UPDATE state SET value=?').run(JSON.stringify(state));
    const before = snapshot(db);
    assert.throws(() => installLunaExample(db, { credentials: 'redacted' }), /already exists without its mapping/);
    assert.deepEqual(snapshot(db), before);
    db.prepare("DELETE FROM presentation_settings WHERE key='artist-catalog'").run();
    const missing = snapshot(db);
    assert.throws(() => installLunaExample(db, { credentials: 'redacted' }), /Install the mapped CHILZ/);
    assert.deepEqual(snapshot(db), missing);
  } finally { db.close(); }
});
