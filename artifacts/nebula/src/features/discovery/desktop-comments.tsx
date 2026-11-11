import { useLayoutEffect, useRef, useState } from 'react';
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'wouter';
import { ArrowUp, Heart, Trash2, X } from 'lucide-react';
import { apiRequest } from '@nebula/local';
import { useAuth } from '@/context/AuthContext';
import { StaticFace } from '@/components/blob-face';
import { refreshSocial } from './social';

export type ReplyTarget = { id:number; author:string };
type Comment = ReplyTarget & { text:string; createdAt:string; picture:string|null; artistId:number|null; liked:boolean; likes:number; replyCount:number; canDelete:boolean };
type Page = {items:Comment[];nextCursor:number|null};
function Face({src,seed}:{src?:string|null;seed:number|string}) {
 const [broken,setBroken]=useState(false);
 return <span className="comment-face">{src&&!broken?<img src={src} alt="" onError={()=>setBroken(true)}/>:<StaticFace seed={seed} size={32}/>}</span>;
}
function useComments(postId:number,identity:string,parent?:number) {
 return useInfiniteQuery({queryKey:['comments',postId,identity,parent??'roots'],initialPageParam:null as number|null,
  queryFn:({pageParam,signal})=>apiRequest<Page>(`/api/publications/${postId}/comments?threaded=1${parent?`&parent=${parent}`:''}${pageParam?`&before=${pageParam}`:''}`,{signal}),
  getNextPageParam:p=>p.nextCursor??undefined,refetchInterval:15000});
}
export function DesktopComments({postId,drafts,replyDrafts}:{postId:number;drafts?:Map<number,string>;replyDrafts?:Map<number,ReplyTarget>}) {
 const {user}=useAuth(),client=useQueryClient();const identity=user?`${user.role}:${user.artistId??user.investorId}`:'guest';
 const [value,setValue]=useState(()=>drafts?.get(postId)??''),[reply,setReply]=useState<ReplyTarget|null>(()=>replyDrafts?.get(postId)??null);
 const [pending,setPending]=useState(false),[error,setError]=useState(''),[expanded,setExpanded]=useState<Set<number>>(new Set());
 const input=useRef<HTMLTextAreaElement>(null);const query=useComments(postId,identity);
 useLayoutEffect(()=>{const node=input.current;if(node){node.style.height='20px';node.style.height=`${Math.min(node.scrollHeight,104)}px`;}},[value]);
 function text(value:string){setValue(value);if(value)drafts?.set(postId,value);else drafts?.delete(postId);}
 function target(value:ReplyTarget|null){setReply(value);if(value)replyDrafts?.set(postId,value);else replyDrafts?.delete(postId);}
 function startReply(item:ReplyTarget){if(pending)return;target(item);input.current?.focus();}
 async function send(){
  if(pending||!value.trim())return;setPending(true);setError('');
  try{await apiRequest(`/api/publications/${postId}/comments`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({text:value.trim(),parentId:reply?.id})});if(reply)setExpanded(old=>new Set([...old,reply.id]));text('');target(null);await refreshSocial(client);}
  catch(e){setError((e as Error).message);}finally{setPending(false);}
 }
 const rowProps={postId,onReply:startReply};
 return <>
  <div className="discovery-comments comment-thread-list" aria-label="Comments">
   {query.isPending&&<p role="status">Loading comments…</p>}
   {query.isError&&<div role="alert"><p>Comments unavailable.</p><button onClick={()=>void query.refetch()}>Try again</button></div>}
   {query.data?.pages.flatMap(p=>p.items).map(item=><div className="comment-thread" key={item.id}>
    <CommentRow item={item} {...rowProps}/>
    {item.replyCount>0&&<button className="comment-replies-toggle" aria-expanded={expanded.has(item.id)} onClick={()=>setExpanded(old=>{const next=new Set(old);if(next.has(item.id))next.delete(item.id);else next.add(item.id);return next;})}>{expanded.has(item.id)?'Hide replies':`View ${item.replyCount} ${item.replyCount===1?'reply':'replies'}`}</button>}
    {expanded.has(item.id)&&item.replyCount>0&&<Replies {...rowProps} identity={identity} parent={item.id}/>}
   </div>)}
   {!query.isPending&&!query.isError&&!query.data?.pages[0].items.length&&<p className="comment-empty">No comments yet. Start the conversation.</p>}
   {query.hasNextPage&&<button className="comment-replies-toggle" disabled={query.isFetchingNextPage} onClick={()=>void query.fetchNextPage()}>Older comments</button>}
  </div>
  {user?<form className="comment-composer" onSubmit={e=>{e.preventDefault();void send();}}>
   {reply&&<div className="comment-reply-target"><span>Replying to {reply.author}</span><button type="button" aria-label="Cancel reply" onClick={()=>target(null)}><X size={15}/></button></div>}
   {error&&<p role="alert">{error}</p>}
   <div className="comment-composer-row"><Face key={user.artist?.picture??user.picture} src={user.artist?.picture??user.picture} seed={identity}/>
    <div className="comment-input-pill"><label htmlFor="desktop-comment" className="sr-only">Add a comment</label><textarea id="desktop-comment" ref={input} rows={1} placeholder={reply?'Add a reply…':'Add comment…'} maxLength={500} value={value} disabled={pending} onChange={e=>text(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey&&!e.nativeEvent.isComposing){e.preventDefault();void send();}}}/></div>
    <button className="comment-submit" aria-label={pending?'Saving…':'Post comment'} disabled={pending||!value.trim()}><ArrowUp size={22}/></button>
   </div>
  </form>:<div className="comment-composer"><Link className="comment-login" href="/login">Log in to comment or reply</Link></div>}
 </>;
}
function Replies({postId,identity,parent,onReply}:{postId:number;identity:string;parent:number;onReply:(item:ReplyTarget)=>void}){
 const query=useComments(postId,identity,parent);
 return <div className="comment-replies">{query.isPending&&<p role="status">Loading replies…</p>}{query.isError&&<button onClick={()=>void query.refetch()}>Retry replies</button>}{query.data?.pages.flatMap(p=>p.items).map(item=><CommentRow key={item.id} item={item} postId={postId} onReply={()=>onReply({id:parent,author:item.author})}/>)}{query.hasNextPage&&<button className="comment-replies-toggle" disabled={query.isFetchingNextPage} onClick={()=>void query.fetchNextPage()}>More replies</button>}</div>;
}
function CommentRow({item,postId,onReply}:{item:Comment;postId:number;onReply:(item:ReplyTarget)=>void}) {
 const {user}=useAuth(),client=useQueryClient();const [busy,setBusy]=useState(false),[error,setError]=useState('');
 async function change(like:boolean){if(busy)return;setBusy(true);setError('');try{await apiRequest(`/api/publications/${postId}/comments/${item.id}${like?'/like':''}`,{method:like?'PUT':'DELETE',...(like?{headers:{'Content-Type':'application/json'},body:JSON.stringify({enabled:!item.liked})}:{})});await refreshSocial(client);}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
 const identity=<><Face key={item.picture} src={item.picture} seed={item.artistId??item.id}/><strong>{item.author}</strong></>;
 const date=new Date(item.createdAt);const valid=Number.isFinite(date.getTime());
 return <article className="comment-row">
  {item.artistId?<Link className="comment-identity" href={`/artist/${item.artistId}`}>{identity}</Link>:<div className="comment-identity">{identity}</div>}
  <p className="comment-text">{item.text}</p>
  <div className="comment-meta">{valid&&<time dateTime={item.createdAt} title={date.toLocaleString()}>{date.getMonth()+1}-{date.getDate()}</time>}{user?<button onClick={()=>onReply(item)}>Reply</button>:<Link href="/login">Reply</Link>}{item.canDelete&&<button className="comment-delete" aria-label={`Delete comment by ${item.author}`} disabled={busy} onClick={()=>void change(false)}><Trash2 size={13}/></button>}</div>
  {user?<button className="comment-like" aria-label={`${item.liked?'Unlike':'Like'} comment by ${item.author}`} aria-pressed={item.liked} disabled={busy} onClick={()=>void change(true)}><Heart size={17} fill={item.liked?'currentColor':'none'}/><span>{item.likes}</span></button>:<Link className="comment-like" href="/login" aria-label={`Sign in to like comment by ${item.author}`}><Heart size={17}/><span>{item.likes}</span></Link>}
  {error&&<p role="alert" className="comment-row-error">{error}</p>}
 </article>;
}
