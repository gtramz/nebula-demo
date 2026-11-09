import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@nebula/local';
import { Link, useLocation } from 'wouter';
import { useAuth } from '@/context/AuthContext';
import { ArrowLeft, Play, RotateCcw, Users } from 'lucide-react';
export const isPresentation = () => document.querySelector('meta[name="nebula-presentation"]')?.getAttribute('content') === 'enabled';
type Status = { mode: 'guided'|'autonomous'; accounts: {id:number;name:string;role:string;picture?:string}[]; pairs:{sourceId:number;resultId?:number;offerId?:number;title:string;startSeconds?:number;endSeconds?:number;baseGain?:number;contributionGain?:number}[] };
export const presentationAction = <T,>(action:string,input:unknown,signal?:AbortSignal) => apiRequest<T>(`/api/presentation/${action}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(input),signal});
export function usePresentation() {return useQuery({queryKey:['presentation'],queryFn:()=>apiRequest<Status>('/api/presentation'),enabled:isPresentation(),staleTime:30_000});}

export function PresentationRuntime() {
  const {user}=useAuth(),client=useQueryClient(),[,navigate]=useLocation();
  useEffect(()=>{
    if(!isPresentation())return;
    const keyboard=(e:KeyboardEvent)=>{if((e.ctrlKey||e.metaKey)&&e.shiftKey&&e.code==='KeyP'){e.preventDefault();navigate('/presentation');}};
    document.addEventListener('keydown',keyboard);return()=>document.removeEventListener('keydown',keyboard);
  },[navigate]);
  useEffect(()=>{
    if(!isPresentation()||!user?.artistId)return;
    let active=true,pending=false;
    const run=async()=>{if(pending||document.hidden)return;pending=true;try{const result=await presentationAction<{changed:number}>('events',{action:'auto'});if(active&&result.changed)await client.invalidateQueries();}catch{/* Existing user requests show their own recoverable errors. */}finally{pending=false;}};
    const timer=setInterval(()=>void run(),5000);return()=>{active=false;clearInterval(timer);};
  },[user?.artistId,client]);
  return null;
}
export function PresentationPage() {
  const {data,error}=usePresentation(),client=useQueryClient(),{user}=useAuth();
  const [busy,setBusy]=useState(false),[notice,setNotice]=useState(''),[confirm,setConfirm]=useState(false);
  if(!isPresentation())return <div className="p-8">Page unavailable.</div>;
  async function act(action:string,input:unknown,reload?:string) {
    setBusy(true);setNotice('');
    try {const result=await presentationAction<{changed?:number}>(action,input);if(reload){if(action==='reset'){try{for(const storage of [localStorage,sessionStorage]){for(const key of Object.keys(storage))if(key.startsWith('nebula')||key.startsWith('antiq-'))storage.removeItem(key);}}catch{/* Server restoration still succeeds when browser storage is unavailable. */}}window.location.assign(reload);return;}await client.invalidateQueries();setNotice(result.changed===undefined?'Updated.':result.changed?`${result.changed} scenario event(s) completed.`:'No eligible events. Create a proposal, opportunity or message first.');}
    catch(e){setNotice((e as Error).message);}finally{setBusy(false);}
  }
  return <main className="mx-auto w-full max-w-4xl p-6 md:p-10 space-y-8">
    <Link href="/explore" className="inline-flex gap-2 items-center text-sm text-muted"><ArrowLeft size={16}/>Back to Nebula</Link>
    <div><p className="voice text-xs text-accent mb-3">PRESENTATION TOOLS</p><h1 className="text-3xl font-bold">Your backstage controls.</h1><p className="text-muted mt-3">Fictional community · local simulation · no real payments or collaborations.</p></div>
    <p className="text-sm">Active account: <strong>{user?.name??'Guest'}</strong></p>
    {error&&<p role="alert">{error.message}</p>}
    <section className="rounded-2xl border border-border p-6 space-y-4"><h2 className="text-xl font-semibold">Presentation mode</h2><div className="flex gap-3">{(['guided','autonomous'] as const).map(mode=><button key={mode} disabled={busy} aria-pressed={data?.mode===mode} className={`px-5 py-3 border ${data?.mode===mode?'bg-cream text-bg border-cream':'border-border'}`} onClick={()=>void act('mode',{mode})}>{mode==='guided'?'Guided':'Autonomous'}</button>)}</div><p className="text-sm text-muted">Guided waits for you. Autonomous responds to eligible actions after a short delay and preserves each event across reloads.</p></section>
    <section className="space-y-4"><h2 className="text-xl font-semibold flex gap-2 items-center"><Users size={20}/>Change perspective</h2><div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">{data?.accounts.map(a=><button disabled={busy} key={a.id} aria-label={`${a.name} ${a.role==='artist'?'Artist':'Investor'}`} className="text-left flex items-center gap-3 border border-border rounded-xl! p-4 hover:border-accent" onClick={()=>void act('switch',{accountId:a.id},'/explore')}>{a.picture&&<img src={a.picture} className="w-11 h-11 rounded-full object-cover" alt=""/>}<span><strong className="block">{a.name}</strong><span className="text-xs text-muted capitalize">{a.role}</span></span></button>)}</div><button disabled={busy} className="border border-border px-5 py-3" onClick={()=>void act('switch',{accountId:0},'/register')}>Start with a new artist</button></section>
    <section className="rounded-2xl border border-border p-6 space-y-4"><h2 className="text-xl font-semibold flex gap-2 items-center"><Play size={20}/>Advance the scenario</h2><div className="flex flex-wrap gap-3">{[['accept','Accept outgoing request'],['reject','Decline outgoing request'],['reply','Reply to a message'],['incoming','Send an incoming proposal'],['delivery','Deliver prepared work']].map(([action,label])=><button key={action} className="border border-border px-4 py-3 text-sm disabled:opacity-40" disabled={busy||!user?.artistId} onClick={()=>void act('events',{action})}>{label}</button>)}</div></section>
    <p role="status" className="text-sm text-accent min-h-5">{busy?'Working…':notice}</p>
    {data?.pairs.some(p=>p.resultId)&&<section className="space-y-4"><h2 className="text-xl font-semibold">Musical collaborations</h2>{data.pairs.filter(p=>p.resultId).map(p=><div key={p.sourceId} className="border border-border rounded-xl p-4 space-y-3"><h3>{p.title}</h3><div className="flex flex-wrap gap-4"><Link className="underline min-h-11 inline-flex items-center" href={`/discovery?post=post-${p.sourceId}`}>Original</Link><Link className="underline min-h-11 inline-flex items-center" href={`/discovery?post=post-${p.resultId}`}>Finished version</Link><Link className="underline min-h-11 inline-flex items-center" href={`/messages/offer/${p.offerId}`}>Prepare a proposal</Link></div></div>)}</section>}
    <section className="border-t border-border pt-6 space-y-3"><h2 className="font-semibold flex gap-2 items-center"><RotateCcw size={18}/>Restore the opening scene</h2><p className="text-sm text-muted">Removes changes made in this presentation, including newly created accounts. Returns to the prepared Artist account and its saved activity.</p>{confirm?<div className="flex flex-wrap gap-3"><button disabled={busy} className="bg-cream text-bg px-5 py-3" onClick={()=>void act('reset',{confirm:true},'/explore')}>Restore prepared scene</button><button className="border border-border px-5 py-3" onClick={()=>setConfirm(false)}>Cancel</button></div>:<button className="border border-border px-5 py-3" onClick={()=>setConfirm(true)}>Restore scenario</button>}</section>
  </main>;
}
