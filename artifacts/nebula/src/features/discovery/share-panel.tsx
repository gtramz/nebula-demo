import {useEffect,useRef,useState} from 'react';
import {useInfiniteQuery,useQueryClient} from '@tanstack/react-query';
import {Link} from 'wouter';
import {Check,Link as LinkIcon,Mail,MessageCircle,Search,Send,Share2} from 'lucide-react';
import {apiRequest,conversationHref,type ConversationKind} from '@nebula/local';
import {useAuth} from '@/context/AuthContext';
import {Avatar,AvatarImage,AvatarFallback} from '@/components/ui/avatar';
import {StaticFace} from '@/components/blob-face';
import {useMessageOperation,refreshMessages} from '@/features/messages/shared';
import {useLeaveGuard} from '@/components/shell/navigation-guard';
import './share-panel.css';
type Target={artistId:number;name:string;picture:string|null;destination:{kind:ConversationKind;id:number}|null;context:string|null;canSend:boolean;reason:string};
type Result={kind:ConversationKind;id:number;admission:'accepted'|'pending'};
export function PublicationShare({postId,title,url,live,onBusy}:{postId:number;title:string;url:string;live:boolean;onBusy:(busy:boolean)=>void}){
 const {user}=useAuth(),client=useQueryClient(),identity=user?`${user.role}:${user.artistId??user.investorId}`:'guest';
 const [search,setSearch]=useState(''),[source,setSource]=useState('all'),[selected,setSelected]=useState<Map<number,Target>>(new Map()),[note,setNote]=useState(''),[pending,setPending]=useState(false),[results,setResults]=useState<Record<number,{name:string;result?:Result;error?:string}>>({}),[status,setStatus]=useState(''),[copyFallback,setCopyFallback]=useState(false);
 const run=useMessageOperation(`share-${postId}`,30000),lock=useRef(false);
 const allowed=live&&user?.role==='artist';
 const query=useInfiniteQuery({queryKey:['share-targets',identity,source,search],enabled:allowed,staleTime:0,refetchOnWindowFocus:true,refetchInterval:10000,initialPageParam:0,queryFn:({pageParam,signal})=>apiRequest<{items:Target[];nextCursor:number|null}>(`/api/messages/share-targets?${new URLSearchParams({source,q:search,offset:String(pageParam)})}`,{signal}),getNextPageParam:p=>p.nextCursor??undefined});
 useLeaveGuard(pending?'Sharing is in progress. Stay to check which messages were sent.':null);
 useEffect(()=>()=>onBusy(false),[onBusy]);
 const items=[...new Map((query.data?.pages.flatMap(p=>p.items)??[]).map(item=>[item.artistId,item])).values()];
 function toggle(item:Target){setSelected(old=>{const next=new Map(old);if(next.has(item.artistId))next.delete(item.artistId);else if(next.size<10)next.set(item.artistId,item);return next;});}
 async function send(){if(lock.current)return;lock.current=true;setPending(true);onBusy(true);setStatus('');const batch=[...selected.values()].filter(t=>!results[t.artistId]?.result);
  try{for(const target of batch){if(!run.isActive())break;try{const result=await run<Result>('/api/messages/share','POST',{publicationId:postId,recipientId:target.artistId,destination:target.destination,note});if(run.isActive())setResults(old=>({...old,[target.artistId]:{name:target.name,result}}));}catch(e){if(!run.isActive())break;setResults(old=>({...old,[target.artistId]:{name:target.name,error:(e as Error).message}}));}}
   if(run.isActive()){void refreshMessages(client);void client.invalidateQueries({queryKey:['share-targets',identity]});}
  }finally{lock.current=false;if(run.isActive()){setPending(false);onBusy(false);}}
 }
 const remaining=[...selected.keys()].filter(id=>!results[id]?.result).length;
 const encoded=encodeURIComponent(url),message=encodeURIComponent(`${title}\n${url}`);
 const external=[{name:'WhatsApp',href:`https://wa.me/?text=${message}`,icon:<MessageCircle/>},{name:'Telegram',href:`https://t.me/share/url?url=${encoded}&text=${encodeURIComponent(title)}`,icon:<Send/>},{name:'Email',href:`mailto:?subject=${encodeURIComponent(title)}&body=${message}`,icon:<Mail/>},{name:'X',href:`https://x.com/intent/tweet?url=${encoded}&text=${encodeURIComponent(title)}`,icon:<span className="share-x">𝕏</span>}];
 return <div className="share-body">
  {allowed?<>
   <label className="share-search"><Search size={19}/><span className="sr-only">Search chats or following</span><input type="search" placeholder="Search" value={search} maxLength={100} disabled={pending} onChange={e=>setSearch(e.target.value)}/></label>
   <div className="share-tabs" aria-label="Share recipients">{['all','chats','following'].map(value=><button key={value} disabled={pending} aria-pressed={source===value} onClick={()=>setSource(value)}>{value==='all'?'All':value==='chats'?'Chats':'Following'}</button>)}</div>
   <div className="share-recipients">
    {query.isPending&&<p role="status">Loading people…</p>}{query.isError&&<div role="alert"><p>People could not be loaded.</p><button onClick={()=>void query.refetch()}>Try again</button></div>}
    {!query.isPending&&!query.isError&&!items.length&&<div><p>{search?'No matches. Try another name.':'Your chats and the artists you follow will appear here.'}</p>{!search&&<Link className="share-find" href="/search">Find artists</Link>}</div>}
    <div className="share-people-grid">{items.map(item=><button key={item.artistId} className="share-person" title={item.context?`${item.name} · ${item.context}`:`${item.name} · ${item.reason}`} aria-label={item.canSend?`Select ${item.name}`:`${item.name}: ${item.reason}`} aria-pressed={selected.has(item.artistId)} disabled={pending||!item.canSend||!!results[item.artistId]?.result||(!selected.has(item.artistId)&&selected.size>=10)} onClick={()=>toggle(item)}>
      <span className="share-person-picture"><Avatar><AvatarImage src={item.picture??undefined} alt=""/><AvatarFallback><StaticFace seed={item.artistId} size={64}/></AvatarFallback></Avatar>{(selected.has(item.artistId)||results[item.artistId]?.result)&&<span className="share-person-check"><Check size={14}/></span>}</span><span className="share-person-name">{item.name}</span><small>{results[item.artistId]?.result?'Sent':item.context?`Chat · ${item.context}`:item.reason}</small>
    </button>)}</div>
    {query.hasNextPage&&<button className="share-load" disabled={query.isFetchingNextPage||pending} onClick={()=>void query.fetchNextPage()}>Load more people</button>}
   </div>
   {!!selected.size&&<div className="share-send"><label className="sr-only" htmlFor="share-note">Add a message</label><input id="share-note" placeholder="Add a message…" maxLength={1000} value={note} disabled={pending||!remaining} onChange={e=>setNote(e.target.value)}/><p className="share-help">New conversations arrive as requests. Up to 10 people.</p><button className="share-send-button" disabled={pending||!remaining} onClick={()=>void send()}>{pending?'Sending…':remaining?`Send (${remaining})`:'Sent'}<Send size={18}/></button></div>}
   {!!Object.keys(results).length&&<div className="share-results" aria-live="polite">{Object.entries(results).map(([id,item])=><div key={id}>{item.result?<p>{item.result.admission==='pending'?'Request sent':'Shared'} with {item.name}. <Link href={conversationHref(item.result.kind,item.result.id)}>Open chat</Link></p>:<p role="alert">{item.name}: {item.error}</p>}</div>)}</div>}
  </>:<div className="share-access">{!live?<p>Sample publications can be shared by link.</p>:!user?<><p>Log in as an artist to share with your chats and following.</p><Link href="/login">Log in</Link></>:<p>In-app messaging is currently available to artists. You can share this link below.</p>}</div>}
  <div className="share-external" aria-label="Share outside Nebula">
   <button onClick={async()=>{try{await navigator.clipboard.writeText(url);setStatus('Link copied.');setCopyFallback(false);}catch{setCopyFallback(true);setStatus('Select and copy the link below.');}}}><span><LinkIcon/></span>Copy link</button>
   {external.map(item=><a key={item.name} href={item.href} target={item.name==='Email'?undefined:'_blank'} rel="noopener noreferrer"><span aria-hidden="true">{item.icon}</span>{item.name}</a>)}
   {typeof navigator.share==='function'&&<button onClick={async()=>{try{await navigator.share({title,url});}catch(e){if((e as Error).name!=='AbortError')setStatus('Sharing is unavailable. Use Copy link.');}}}><span><Share2/></span>More</button>}
  </div>
  <div className="share-status"><p role="status">{status}</p>{copyFallback&&<><label className="sr-only" htmlFor="share-copy">Publication link</label><input id="share-copy" readOnly value={url} onFocus={e=>e.target.select()}/></>}{['127.0.0.1','localhost'].includes(location.hostname)&&<p className="share-help">This link opens on this device only.</p>}</div>
 </div>;
}
