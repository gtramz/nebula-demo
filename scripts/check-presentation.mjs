import { mkdtemp, cp, copyFile, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';
import assert from 'node:assert/strict';
import { createNebulaServer } from '../dist-server/server/app.js';
const dir=await mkdtemp(join(tmpdir(),'nebula-presentation-acceptance-'));
const source=resolve(process.env.NEBULA_PRESENTATION_FIXTURE??'.data/presentation');
await copyFile(join(source,'initial.sqlite'),join(dir,'nebula.sqlite'));
await copyFile(join(source,'initial.sqlite'),join(dir,'initial.sqlite'));
await cp(join(source,'media'),join(dir,'media'),{recursive:true});
await cp(join(source,'prepared'),join(dir,'prepared'),{recursive:true});
let server,origin;
const checks=[];
const pass=name=>{checks.push(name);console.log('PASS',name);};
async function start(){server=await createNebulaServer({dataDir:dir,publicDir:resolve('artifacts/nebula/dist/public'),presentation:true});await new Promise(r=>server.listen(0,'127.0.0.1',r));origin=`http://127.0.0.1:${server.address().port}`;}
async function stop(){await new Promise(r=>{server.close(r);server.closeIdleConnections();server.closeAllConnections();});}
function client(){let cookie='';return {
  async request(path,method='GET',input,extra={}){const response=await fetch(origin+path,{signal:AbortSignal.timeout(30000),method,headers:{Origin:origin,'X-Nebula-Request':'1',Cookie:cookie,...(input&&!Buffer.isBuffer(input)?{'Content-Type':'application/json'}:{}),...extra},body:input===undefined?undefined:Buffer.isBuffer(input)?input:JSON.stringify(input)});if(response.headers.get('set-cookie'))cookie=response.headers.get('set-cookie').split(';')[0];return response;},
  async json(path,method='GET',input,extra={}){const response=await this.request(path,method,input,extra);const data=await response.json();assert.ok(response.ok,`${path} ${response.status}: ${JSON.stringify(data)}`);return data;},
  async rpc(method,...args){return (await this.json('/api/rpc','POST',{method,args})).result;},
  async upload(path,draft){return this.json('/api/uploads','POST',await readFile(path),{'Content-Type':'application/octet-stream','X-Media-Kind':'audio','X-File-Name':'new-take.mp3',...(draft?{'X-Remix-Draft':draft}:{})});}
};}
async function completeFeed(viewer){const feed=await viewer.json('/api/feed');let next=feed.nextCursor;while(next!==null){const page=await viewer.json(`/api/feed?offset=${next}&snapshot=${encodeURIComponent(feed.snapshot)}`);feed.items.push(...page.items);next=page.nextCursor;}return feed;}
try {
  await start();const a=client(),b=client(),investor=client();
  const status=await a.json('/api/presentation');assert.equal(status.accounts.length,12);assert.ok(status.accounts.some(a=>a.name==='Sol Rivera'));const preparedUser=(await a.json('/api/session')).user;assert.equal(preparedUser.name,'CHILZ');
  const feed=await completeFeed(a);const baselineCount=feed.items.length;assert.ok(baselineCount>=12);assert.ok(feed.items.some(p=>p.remix));assert.ok(feed.items.some(p=>p.media.kind==='video'));pass('CHILZ principal plus Sol, gramz, SANNFERNNA and eight supporting accounts, all existing posts and attributed remixes');
  for(const post of feed.items){const media=await a.request(post.media.url);assert.equal(media.status,200);assert.ok(Number(media.headers.get('content-length'))>1000);await media.arrayBuffer();const cover=await a.request(post.coverUrl);assert.equal(cover.status,200);await cover.arrayBuffer();const waveform=await a.json(`/api/publications/${post.id}/waveform?listen=1`);assert.ok(waveform.duration>1);assert.ok(waveform.peaks.some(p=>p>0));}pass('every publication and cover loads locally; every waveform has real audio');
  const user=await a.rpc('register',{name:'Acceptance Artist',email:'acceptance@nebula.local',password:'Nebula2026!',role:'artist'});
  await a.rpc('updateArtistIdentity',{profile:{creativeRoles:['producer','vocalist'],genreIds:['rnb','electronic']},preferences:{collaboration:{opportunityTypes:['Production'],compensationKinds:['split']},discovery:{genreIds:['rnb']}},onboarding:{step:4,finish:true}});
  assert.equal((await a.rpc('getArtist',user.artistId)).projects.length,0);
  const home=await a.json('/api/opportunities/projects');assert.ok(home.items[0].offers.some(o=>o.need==='Production'));pass('new identity has no fake history; Home ranks compatible needs');
  const original=feed.items.find(p=>p.id===status.pairs[0].sourceId),project=original.project;
  await a.json(`/api/artists/${original.artistId}/follow`,'PUT',{});const following=await a.json('/api/opportunities/projects?mode=following');assert.ok(following.items.every(p=>p.project.artistId===original.artistId));
  await a.json(`/api/publications/${original.id}/star`,'PUT',{enabled:true});await a.json(`/api/publications/${original.id}/save`,'PUT',{enabled:true});await a.json(`/api/publications/${original.id}/comments`,'POST',{text:'A new perspective on this rhythm.'});assert.ok((await a.json('/api/saved')).items.some(p=>p.id===original.id));pass('follow, Following, likes, comments and private saves');
  const content=await a.json('/api/catalog/content?q=marea');assert.ok(content.songs.length&&content.publications.length);pass('global search resolves songs and publications');
  const draft=await a.json('/api/remix-drafts','POST',{sourceId:original.id,sourceRevision:original.revision,requestKey:randomUUID()});
  const contribution=await a.json('/api/presentation/contribution','POST',{sourceId:original.id,draftId:draft.id});
  await b.rpc('register',{name:'Another Artist',email:'another@nebula.local',password:'Nebula2026!',role:'artist'});assert.equal((await b.request(contribution.url)).status,404);pass('prepared take belongs to the new artist and stays private');
  const manifest=JSON.parse(await readFile('presentation/assets/manifest.json','utf8')),set=manifest.remixSets[0],render=await a.upload(resolve('presentation/assets',set.result),draft.id);
  const saved=await a.json(`/api/remix-drafts/${draft.id}`,'PATCH',{revision:draft.revision,title:'A new Marea perspective',description:'Saxophone and movement',settings:{...draft.settings,contributionKind:'audio',startSeconds:0,endSeconds:set.endSeconds,baseGain:set.baseGain,voiceGain:set.contributionGain,voiceOffset:0},contributionId:contribution.id,contributionDuration:45,renderId:render.id});
  const host=client();await host.json('/api/presentation/switch','POST',{accountId:original.artistId});
  const offer=await host.json(`/api/projects/${project.id}/offers`,'POST',{workId:original.workId,referenceMediaId:original.media.id,need:'Production',deliverable:'A new arrangement',requirements:'Keep the pulse',deadline:null,status:'open',compensation:{kind:'split',percent:15}});
  const thread=await a.json(`/api/offers/${offer.id}/conversations`,'POST',{operationId:randomUUID(),introduction:'I have a melodic take for this track.',text:'Here is my contribution to the arrangement.',acceptTerms:true,offerRevision:offer.revision,mediaId:render.id,remixDraftId:saved.id});
  await a.json('/api/presentation/events','POST',{action:'accept'});
  const accepted=await a.json(`/api/collaborations/${thread.id}`);assert.equal(accepted.admission,'accepted');assert.equal(accepted.id,thread.id);assert.ok(accepted.submissions[0].remix);await a.json(`/api/collaborations/${thread.id}/messages`,'POST',{operationId:randomUUID(),text:'Thanks, I will develop the second half.'});await a.json('/api/presentation/events','POST',{action:'reply'});pass('private remix proposal, acceptance and conversation in the same thread');
  const created=await a.rpc('createProject',{title:'Northern Lights',category:'single',status:'published',goalAmount:2000,pitch:'An electronic soul collaboration',operationId:randomUUID(),songs:[{title:'Northern Lights',description:'Work in progress'}]});
  await a.json(`/api/projects/${created.id}/offers`,'POST',{need:'Mix',deliverable:'Stereo mix',requirements:'Keep the vocal intimate',deadline:null,status:'open',compensation:{kind:'fee',amount:350,currency:'USD'}});
  await a.json('/api/presentation/events','POST',{action:'incoming'});const requests=await a.json('/api/messages?view=requests&direction=received');assert.equal(requests.items.length,1);const incoming=await a.json(`/api/collaborations/${requests.items[0].id}`);
  await a.json(`/api/collaborations/${incoming.id}`,'PATCH',{operationId:randomUUID(),action:'accept',revision:incoming.revision,submissionId:incoming.submissions.at(-1).id,offerRevision:incoming.currentOffer.revision});await a.json('/api/presentation/events','POST',{action:'delivery'});let delivery=await a.json(`/api/collaborations/${incoming.id}`);assert.equal(delivery.status,'delivered');
  await a.json(`/api/collaborations/${incoming.id}`,'PATCH',{operationId:randomUUID(),action:'request_changes',revision:delivery.revision,feedback:'Please keep the low end lighter.'});await a.json('/api/presentation/events','POST',{action:'delivery'});delivery=await a.json(`/api/collaborations/${incoming.id}`);assert.equal(delivery.status,'delivered');await a.json(`/api/collaborations/${incoming.id}`,'PATCH',{operationId:randomUUID(),action:'complete',revision:delivery.revision});pass('new project, incoming proposal, delivery, revision and completion');
  const media=await a.upload(resolve('presentation/assets',manifest.music[0].path));
  const publication=await a.json('/api/publications','POST',{title:'Northern Lights — first session',description:'Our opening direction',mediaId:media.id,coverId:null,projectId:created.id,allowRemix:true,status:'draft'});assert.equal((await b.request(`/api/publications/${publication.id}`)).status,404);
  await a.json(`/api/publications/${publication.id}`,'PATCH',{...publication,status:'published',revision:publication.revision});assert.equal((await b.request(`/api/publications/${publication.id}`)).status,200);pass('private draft and public publication transitions');
  await a.json('/api/presentation/mode','POST',{mode:'autonomous'});
  const clockDb=new DatabaseSync(join(dir,'nebula.sqlite'));clockDb.prepare('UPDATE posts SET created=? WHERE id=?').run(new Date(Date.now()-20_000).toISOString(),publication.id);clockDb.close();
  const activity=await a.json('/api/presentation/events','POST',{action:'auto'});assert.ok(activity.changed>0);
  const livePost=await a.json(`/api/publications/${publication.id}`);assert.equal(livePost.social.stars,1);assert.equal(livePost.social.comments,1);
  await a.json('/api/presentation/events','POST',{action:'auto'});const samePost=await a.json(`/api/publications/${publication.id}`);assert.equal(samePost.social.stars,1);assert.equal(samePost.social.comments,1);
  await a.json('/api/presentation/mode','POST',{mode:'guided'});assert.equal((await a.json('/api/presentation/events','POST',{action:'auto'})).changed,0);pass('autonomous community reactions persist once; guided mode waits');
  const otherOffer=(await a.json('/api/opportunities/projects')).items.flatMap(p=>p.offers).find(o=>o.ownerId!==user.artistId&&o.available);
  const rejected=await a.json(`/api/offers/${otherOffer.id}/conversations`,'POST',{operationId:randomUUID(),introduction:'A different direction',text:'An alternative take.',acceptTerms:true,offerRevision:otherOffer.revision,mediaId:media.id});await a.json('/api/presentation/events','POST',{action:'reject'});const closed=await a.json(`/api/collaborations/${rejected.id}`);assert.equal(closed.admission,'rejected');assert.equal((await a.request(`/api/collaborations/${rejected.id}/messages`,'POST',{operationId:randomUUID(),text:'Should not send'})).status,409);pass('rejection closes the request without opening a chat');
  await investor.json('/api/presentation/switch','POST',{accountId:status.accounts.find(a=>a.role==='investor').id});const funding=(await investor.rpc('listProjects',{})).find(p=>p.status==='funding');const pledge=await investor.rpc('createInvestment',{projectId:funding.id,amount:125,publicVisibility:{showName:true,showAmount:true}});assert.ok((await investor.rpc('listMyInvestments')).some(p=>p.id===pledge.id));await b.json('/api/presentation/switch','POST',{accountId:funding.artistId});assert.ok((await b.rpc('listReceivedInvestments')).some(p=>p.id===pledge.id));pass('Investor contribution is reflected in recipient history');
  await stop();await start();assert.equal((await a.json('/api/session')).user.artistId,user.artistId);assert.ok((await a.rpc('listProjects',{})).some(p=>p.id===created.id));pass('server restart preserves identity, projects and conversations');
  await a.json('/api/presentation/reset','POST',{confirm:true});await a.json('/api/presentation/reset','POST',{confirm:true});assert.equal((await completeFeed(a)).items.length,baselineCount);assert.equal((await a.json('/api/session')).user.artistId,preparedUser.artistId);pass('repeated restore returns to the clean opening scene');
  await writeFile('.data/presentation-acceptance.json',JSON.stringify({passed:checks.length,checks},null,2));
}finally{if(server?.listening)await stop();await rm(dir,{recursive:true,force:true});}
