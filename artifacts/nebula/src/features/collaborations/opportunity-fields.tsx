import { useEffect, useState } from 'react';
import type { OfferInput } from '@nebula/local';
import { controlStyles } from '@/components/antiq/workspace';
import { uploadMedia, usePublications } from '@/features/discovery/publication-api';
const {field}=controlStyles;
export const emptyOpportunity: OfferInput = {need:'Feature',deliverable:'',requirements:'',deadline:null,status:'open',compensation:{kind:'split',percent:15}};
export type OpportunitySection = 'scope'|'brief'|'compensation'|'timing'|'reference';
export function OpportunityFields({value,onChange,projectId,onBusy,section}:{value:OfferInput;onChange:(value:OfferInput)=>void;projectId?:number;onBusy?:(busy:boolean)=>void;section?:OpportunitySection}) {
 const setValue=onChange, posts=usePublications(true),[busy,setBusy]=useState(false),[error,setError]=useState(''),[uploadedKind,setUploadedKind]=useState<'audio'|'video'>('audio');
 const show=(part:OpportunitySection)=>!section||section===part;
 const choices=posts.data?.pages.flatMap(p=>p.items).filter(p=>['audio','video'].includes(p.media.kind) && !p.remix && (!projectId || p.projectId===projectId) && (!value.workId || p.workId===value.workId))??[];
 useEffect(()=>{if(!value.referenceMediaId)return;const controller=new AbortController();void fetch(`/media/${value.referenceMediaId}`,{method:'HEAD',signal:controller.signal}).then(r=>{if(r.ok&&!controller.signal.aborted)setUploadedKind(r.headers.get('content-type')?.startsWith('video/')?'video':'audio');}).catch(()=>{});return()=>controller.abort();},[value.referenceMediaId]);
 return <fieldset disabled={busy} className="min-w-0 space-y-4">
  {show('scope')&&<label className="block space-y-2">Looking for<select className={field} value={value.need} onChange={e=>setValue({...value,need:e.target.value as OfferInput['need']})}>{['Verse','Feature','Production','Mix','Master'].map(need=><option key={need}>{need}</option>)}</select></label>}
  {show('brief')&&<>
   <label className="block space-y-2">Expected deliverable<textarea className={field} required maxLength={2000} rows={3} value={value.deliverable} onChange={e=>setValue({...value,deliverable:e.target.value})}/></label>
   <label className="block space-y-2">Requirements and terms<textarea className={field} maxLength={4000} rows={4} placeholder="Style, language, file format, revisions, credit and payment or royalty conditions." value={value.requirements} onChange={e=>setValue({...value,requirements:e.target.value})}/></label>
  </>}
  {show('compensation')&&<div className="grid sm:grid-cols-2 gap-4">
   <label className="block space-y-2">Compensation<select className={field} value={value.compensation.kind} onChange={e=>setValue({...value,compensation:e.target.value==='split'?{kind:'split',percent:10}:{kind:'fee',amount:100,currency:'USD'}})}><option value="split">Royalty split</option><option value="fee">Fixed fee (USD)</option></select></label>
   <label className="block space-y-2">{value.compensation.kind==='split'?'Royalty percentage':'Fee in USD'}<input className={field} required type="number" min="0.01" max={value.compensation.kind==='split'?100:1000000} step="0.01" value={value.compensation.kind==='split'?value.compensation.percent:value.compensation.amount} onChange={e=>setValue({...value,compensation:value.compensation.kind==='split'?{kind:'split',percent:Number(e.target.value)}:{kind:'fee',amount:Number(e.target.value),currency:'USD'}})}/></label>
  </div>}
  {show('timing')&&<>
   <label className="block space-y-2">Application deadline (optional, UTC)<input className={field} type="date" min={new Date().toISOString().slice(0,10)} value={value.deadline??''} onChange={e=>setValue({...value,deadline:e.target.value||null})}/></label>
   <label className="block space-y-2">Offer status<select className={field} value={value.status} onChange={e=>setValue({...value,status:e.target.value as OfferInput['status']})}><option value="open">Open — looking for collaborators</option><option value="closed">Closed</option></select></label>
  </>}
  {show('reference')&&<>
   <label className="block space-y-2">Musical reference<select className={field} value={value.referenceMediaId??''} onChange={e=>setValue({...value,referenceMediaId:e.target.value||null})}><option value="">Choose a recording or upload below</option>{value.referenceMediaId&&!choices.some(p=>p.media.id===value.referenceMediaId)&&<option value={value.referenceMediaId}>Uploaded reference</option>}{choices.map(p=><option key={p.id} value={p.media.id}>{p.title}</option>)}</select></label>
   {posts.hasNextPage&&<button type="button" className="underline min-h-11" onClick={()=>void posts.fetchNextPage()}>Load more recordings</button>}
   <label className="block space-y-2">Upload reference audio or video<input type="file" accept="audio/*,video/*" className={field} onChange={async e=>{const file=e.target.files?.[0];e.target.value='';if(!file)return;setBusy(true);onBusy?.(true);setError('');try{const media=await uploadMedia(file,file.type.startsWith('video/')?'video':'audio',()=>{},new AbortController().signal);setUploadedKind(media.kind as 'audio'|'video');setValue({...value,referenceMediaId:media.id});}catch(failure){setError((failure as Error).message);}finally{setBusy(false);onBusy?.(false);}}}/></label>
   {busy&&<p role="status">Uploading reference…</p>}{error&&<p role="alert">{error}</p>}
   {value.referenceMediaId&&((choices.find(p=>p.media.id===value.referenceMediaId)?.media.kind??uploadedKind)==='video'?<video controls playsInline src={`/media/${value.referenceMediaId}`} aria-label="Opportunity reference" className="w-full max-h-64 object-contain"/>:<audio controls preload="metadata" src={`/media/${value.referenceMediaId}`} aria-label="Opportunity reference" className="w-full"/>)}
   <p className="text-xs text-muted">Choose the exact recording for this opportunity. The reference becomes accessible with the published project; drafts stay private.</p>
  </>}
 </fieldset>;
}
