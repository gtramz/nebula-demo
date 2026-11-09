/** Promote only the verified local presentation copy, with a stale-base guard. */
import {DatabaseSync,backup} from 'node:sqlite';
import {readFile,cp,mkdir,writeFile} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {createHash} from 'node:crypto';
const live=resolve('.data/presentation'),stage=resolve('.data/presentation-closing-stage');
const hash=v=>createHash('sha256').update(v).digest('hex');
const ephemeral=new Set(['sessions','feed_snapshots','rate_limits']);
function records(db){return Object.fromEntries(db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name").all().filter(t=>!ephemeral.has(t.name)).map(t=>{if(!/^[a-z_]+$/.test(t.name))throw Error('Unexpected table');return[t.name,hash(db.prepare(`SELECT * FROM ${t.name}`).all().map(r=>JSON.stringify(r)).sort().join('\n'))];}));}
const before=new DatabaseSync(join(stage,'base.sqlite'),{readOnly:true}),current=new DatabaseSync(join(live,'nebula.sqlite'));
const a=records(before),b=records(current);before.close();
if(JSON.stringify(a)!==JSON.stringify(b)){current.close();throw Error('The live presentation changed while staging. Preserve it and rebase the prepared examples before activation.');}
const staged=new DatabaseSync(join(stage,'nebula.sqlite'));
if(!staged.prepare("SELECT 1 FROM presentation_settings WHERE key='audiovisual-close'").get())throw Error('Verified audiovisual scene missing.');
for(const media of current.prepare('SELECT id FROM media').all())if(hash(await readFile(join(live,'media',media.id)))!==hash(await readFile(join(stage,'media',media.id))))throw Error('Original media changed in stage: '+media.id);
const backupDir=resolve('.data/demo-close/activation-backup');await mkdir(backupDir,{recursive:true});await backup(current,join(backupDir,'nebula.sqlite'));await cp(join(live,'initial.sqlite'),join(backupDir,'initial.sqlite'));await cp(join(live,'media'),join(backupDir,'media'),{recursive:true});
// Preserve existing browser sessions, returning the presentation to its principal.
const sessions=current.prepare('SELECT token,expires FROM sessions WHERE expires>?').all(Date.now());staged.exec('DELETE FROM sessions; DELETE FROM rate_limits; DELETE FROM feed_snapshots;');
for(const s of sessions)staged.prepare('INSERT INTO sessions VALUES(?,?,?)').run(s.token,19,s.expires);
await cp(join(stage,'media'),join(live,'media'),{recursive:true});await cp(join(stage,'prepared'),join(live,'prepared'),{recursive:true});
current.close();await backup(staged,join(live,'nebula.sqlite'));staged.close();await cp(join(stage,'initial.sqlite'),join(live,'initial.sqlite'));await cp(join(stage,'closing-scene.json'),join(live,'closing-scene.json'));
await writeFile('.data/demo-close/activation.json',JSON.stringify({activatedAt:new Date().toISOString(),originalTablesCompared:Object.keys(a),originalMediaPreserved:true,backupDir,principalId:19},null,2));console.log('Verified presentation activated; original records and media preserved.');
