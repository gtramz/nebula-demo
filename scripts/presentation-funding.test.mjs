import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { copyFile, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { installChilzFunding } from './presentation-funding.mjs';

test('CHILZ funding is additive, idempotent and leaves existing data and media untouched', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'nebula-funding-'));
  let db;
  try {
    const path = join(dir, 'test.sqlite'); await copyFile('presentation/seed/scene.sqlite', path); db = new DatabaseSync(path);
    // Reconstruct pre-install state in this disposable fixture, including on future runs.
    const receipt = db.prepare("SELECT value FROM presentation_settings WHERE key='chilz-funding-v1'").get();
    if (receipt) {
      const mapping = JSON.parse(receipt.value), state = JSON.parse(db.prepare('SELECT value FROM state WHERE id=1').get().value);
      state.projects = state.projects.filter(p => p.id !== mapping.projectId);
      state.investments = state.investments.filter(i => !mapping.contributionIds.includes(i.id));
      state.visibility = state.visibility.filter(v => v.projectId !== mapping.projectId);
      db.prepare('UPDATE state SET value=? WHERE id=1').run(JSON.stringify(state));
      db.prepare("DELETE FROM presentation_settings WHERE key='chilz-funding-v1'").run();
    }
    const before = JSON.parse(db.prepare('SELECT value FROM state WHERE id=1').get().value);
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT IN ('state','presentation_settings') ORDER BY name").all();
    const snapshots = tables.map(({ name }) => JSON.stringify(db.prepare(`SELECT * FROM "${name}"`).all()));
    const result = installChilzFunding(db), after = JSON.parse(db.prepare('SELECT value FROM state WHERE id=1').get().value);
    assert.equal(result.changed, true);
    for (const field of Object.keys(before).filter(k => !['projects','investments','visibility','nextId'].includes(k))) assert.deepEqual(after[field], before[field]);
    for (const field of ['projects','investments','visibility']) assert.deepEqual(after[field].slice(0,before[field].length), before[field]);
    assert.equal(after.projects.length, before.projects.length + 1);
    assert.equal(after.investments.length, before.investments.length + 2);
    assert.equal(after.investments.filter(i => result.contributionIds.includes(i.id)).reduce((sum,i)=>sum+i.amount,0), 2000);
    const saved = db.prepare('SELECT value FROM state WHERE id=1').get().value;
    assert.equal(installChilzFunding(db).changed,false);
    assert.equal(db.prepare('SELECT value FROM state WHERE id=1').get().value,saved);
    tables.forEach(({name},index)=>assert.equal(JSON.stringify(db.prepare(`SELECT * FROM "${name}"`).all()),snapshots[index]));
    // Failure before commit must leave no partial records.
    db.prepare("DELETE FROM presentation_settings WHERE key='chilz-funding-v1'").run();
    db.exec("CREATE TRIGGER reject_funding BEFORE INSERT ON presentation_settings BEGIN SELECT RAISE(ABORT,'blocked'); END");
    assert.throws(()=>installChilzFunding(db),/blocked/);
    assert.equal(db.prepare('SELECT value FROM state WHERE id=1').get().value,saved);
  } finally { db?.close(); await rm(dir,{recursive:true,force:true}); }
});
