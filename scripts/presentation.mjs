import { DatabaseSync, backup } from 'node:sqlite';
import { copyFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { preparePresentation } from './presentation-seed.mjs';

const directory=resolve('.data/presentation');
const command=process.argv[2]??'start',port=Number(process.env.PORT??4174),origin=`http://127.0.0.1:${port}`;
async function prepare() { return preparePresentation(directory); }
function client(serverOrigin) {
  return { async call(path,method='GET',body) {
    const response=await fetch(serverOrigin+path,{method,headers:{Origin:serverOrigin,'X-Nebula-Request':'1','Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});
    const data=await response.json();if(!response.ok)throw new Error(`${method} ${path} (${response.status}): ${data.error}`);return data;
  }};
}
if(command==='prepare')await prepare();
else if(command==='checkpoint') {
  const db=new DatabaseSync(join(directory,'nebula.sqlite'));
  try {
    const state=JSON.parse(db.prepare('SELECT value FROM state WHERE id=1').get().value);
    const principal=state.accounts.find(a=>a.email==='sol.rivera@nebula.local');
    if(!principal)throw new Error('The prepared Sol Rivera account is missing. No snapshot was changed.');
    const scene=JSON.parse(db.prepare("SELECT value FROM presentation_settings WHERE key='scenario'").get().value);scene.principalId=principal.id;
    db.prepare("UPDATE presentation_settings SET value=? WHERE key='scenario'").run(JSON.stringify(scene));
    const destination=join(directory,'prepared-scene.sqlite');await backup(db,destination);
    const snapshot=new DatabaseSync(destination);snapshot.exec('DELETE FROM sessions; DELETE FROM rate_limits; DELETE FROM feed_snapshots;');snapshot.close();
    await copyFile(destination,join(directory,'initial.sqlite'));
    console.log(`Prepared scene saved for ${principal.name}. Existing shared activity is preserved.`);
  } finally {db.close();}
}
else if(command==='reset'){const c=client(origin);await c.call('/api/presentation/reset','POST',{confirm:true});console.log('Prepared scene restored. Open /explore.');}
else if(command==='start'){
  if(!existsSync(join(directory,'initial.sqlite')))throw new Error('Run pnpm demo:prepare first.');
  const { createNebulaServer } = await import('../dist-server/server/app.js');
  const server=await createNebulaServer({dataDir:directory,publicDir:resolve('artifacts/nebula/dist/public'),origin,presentation:true});
  server.listen(port,'127.0.0.1',()=>console.log(`Nebula: ${origin}\nPresentation controls: ${origin}/presentation`));
  for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>{server.close();server.closeIdleConnections();});
}else throw new Error('Use prepare, start or reset.');
