import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {copyFile,mkdtemp,rm,readdir} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {installGramzCatalog} from './presentation-gramz.mjs';
const read=(db,key)=>JSON.parse(db.prepare('SELECT value FROM presentation_settings WHERE key=?').get(key).value);
async function fixture(t){const dir=await mkdtemp(join(tmpdir(),'gramz-import-'));t.after(()=>rm(dir,{recursive:true,force:true}));await copyFile('presentation/seed/scene.sqlite',join(dir,'scene.sqlite'));const db=new DatabaseSync(join(dir,'scene.sqlite'));t.after(()=>db.close());
 // Reconstruct the pre-import state only in a disposable copy, including after the portable scene has been upgraded.
 const row=db.prepare("SELECT value FROM presentation_settings WHERE key='gramz-import'").get();if(row){const r=JSON.parse(row.value),state=JSON.parse(db.prepare('SELECT value FROM state').get().value),ids=new Set(r.catalog.releases.map(p=>p.projectId));state.projects=state.projects.filter(p=>!ids.has(p.id));db.prepare('UPDATE state SET value=?').run(JSON.stringify(state));
 for(const release of r.catalog.releases){db.prepare('DELETE FROM project_works WHERE project=?').run(release.projectId);db.prepare('DELETE FROM project_tracklists WHERE project=?').run(release.projectId);for(const track of release.tracks)db.prepare('DELETE FROM works WHERE id=?').run(track.workId);}
 for(const p of r.posts)db.prepare('DELETE FROM posts WHERE id=?').run(p.id);for(const m of r.media)db.prepare('DELETE FROM media WHERE id=?').run(m.id);for(const id of r.offerIds)db.prepare('DELETE FROM collaboration_offers WHERE id=?').run(id);
 db.prepare('DELETE FROM artist_conversations WHERE id=?').run(r.contactId);const chilz=read(db,'artist-catalog').artistId;
 db.prepare('DELETE FROM artist_notifications WHERE kind=? AND ((recipient=? AND actor=?) OR (recipient=? AND actor=?))').run('artist.followed',chilz,r.artistId,r.artistId,chilz);
 db.prepare('DELETE FROM artist_follows WHERE (follower=? AND artist=?) OR (follower=? AND artist=?)').run(chilz,r.artistId,r.artistId,chilz);
 db.prepare("DELETE FROM presentation_settings WHERE key IN ('gramz-import',?)").run(`artist-catalog:${r.artistId}`);}
 return{db,dir};}
const tables=db=>Object.fromEntries(db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map(({name})=>[name,db.prepare(`SELECT * FROM ${name}`).all()]));
test('gramz import preserves identities, LUNA and previous content; repeat is a no-op',async t=>{const {db,dir}=await fixture(t),before=tables(db),state=JSON.parse(before.state[0].value),luna=read(db,'luna-example');
 const result=installGramzCatalog(db,{mediaDirectory:join(dir,'media')});assert.equal(result.changed,true);assert.equal(result.catalog.releases.length,11);assert.equal(result.posts.length,8);assert.equal(result.media.length,16);
 const after=JSON.parse(db.prepare('SELECT value FROM state').get().value);assert.deepEqual(after.accounts,state.accounts);assert.deepEqual(after.projects.filter(p=>state.projects.some(old=>old.id===p.id)),state.projects);assert.deepEqual(after.artists.filter(a=>a.id!==result.artistId),state.artists.filter(a=>a.id!==result.artistId));assert.deepEqual(read(db,'luna-example'),luna);assert.deepEqual(read(db,'artist-catalog'),JSON.parse(before.presentation_settings.find(s=>s.key==='artist-catalog').value));
 for(const name of ['posts','media','works','project_works','project_tracklists','collaboration_offers','artist_messages','collaborations','collaboration_submissions','collaboration_files','collaboration_messages','artist_follows','artist_notifications']){const rows=db.prepare(`SELECT * FROM ${name}`).all();for(const row of before[name])assert(rows.some(v=>JSON.stringify(v)===JSON.stringify(row)),`Preserve old ${name}`);}
 assert.equal(db.prepare('SELECT count(*) n FROM artist_messages WHERE thread=?').get(result.contactId).n,0);assert.equal(db.prepare('SELECT admission FROM artist_conversations WHERE id=?').get(result.contactId).admission,'accepted');assert.equal(db.prepare('SELECT count(*) n FROM artist_follows WHERE follower IN (?,?) AND artist IN (?,?)').get(result.artistId,21,result.artistId,21).n,2);
 assert.equal(read(db,`artist-catalog:${result.artistId}`).releases.filter(r=>r.title==='No Pop').length,1);assert(!result.catalog.releases.some(r=>/luna/i.test(r.title)));
 const complete=tables(db);assert.equal(installGramzCatalog(db,{mediaDirectory:join(dir,'media')}).changed,false);assert.deepEqual(tables(db),complete);
});
test('failed notification rolls back imported rows and staged files',async t=>{const {db,dir}=await fixture(t);db.exec("CREATE TRIGGER fail_gramz BEFORE INSERT ON artist_notifications BEGIN SELECT RAISE(ABORT,'test failure'); END;");const before=tables(db);assert.throws(()=>installGramzCatalog(db,{mediaDirectory:join(dir,'media')}),/test failure/);assert.deepEqual(tables(db),before);assert.deepEqual(await readdir(join(dir,'media')),[]);});
