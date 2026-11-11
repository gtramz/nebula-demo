import {useEffect,useRef,useState} from 'react';
import {useQuery} from '@tanstack/react-query';
import {apiRequest,type Waveform} from '@nebula/local';
import {Pause,Play} from 'lucide-react';
import {useAuth} from '@/context/AuthContext';
import {WaveformProgress} from '@/features/discovery/media-player';
import './audio-preview.css';
const clock=(v:number)=>`${Math.floor(v/60)}:${String(Math.floor(v%60)).padStart(2,'0')}`;
const placeholderBars=[24,42,68,36,56,82,46,66,34,76,52,88,40,60,80,48,30,62,44,72,50,32,54,22];
/** One real media element, with waveform values decoded from this exact source. */
export function AudioPreview({src,title,waveformUrl,waveformLoader,hoverPreview=false,onReady}:{src:string;title:string;waveformUrl?:string;waveformLoader?:(signal:AbortSignal)=>Promise<Waveform>;hoverPreview?:boolean;onReady?:()=>void}) {
 const {user}=useAuth();
 const audio=useRef<HTMLAudioElement>(null),root=useRef<HTMLDivElement>(null);
 const hoverAttempt=useRef(0),hoverOwner=useRef<{element:HTMLAudioElement;ticket:number}|null>(null);
 const [visible,setVisible]=useState(false),[inView,setInView]=useState(false),[mediaReady,setMediaReady]=useState(false),[playing,setPlaying]=useState(false),[position,setPosition]=useState(0),[duration,setDuration]=useState(0),[error,setError]=useState('');
 useEffect(()=>{const el=root.current;if(!el)return;const near=new IntersectionObserver(entries=>{if(entries.some(e=>e.isIntersecting)){setVisible(true);near.disconnect();}},{rootMargin:'480px'}),current=new IntersectionObserver(entries=>setInView(entries.some(e=>e.isIntersecting)));near.observe(el);current.observe(el);return()=>{near.disconnect();current.disconnect();};},[]);
 useEffect(()=>{const el=audio.current;const pause=()=>{if(document.hidden)el?.pause();};document.addEventListener('visibilitychange',pause);return()=>{el?.pause();document.removeEventListener('visibilitychange',pause);};},[src]);
 useEffect(()=>{
  const element=audio.current;if(!hoverPreview||!element)return;
  const ticket=++hoverAttempt.current;let active=true;
  const blocked=()=>document.hidden||document.body.hasAttribute('data-scroll-locked')||document.body.style.overflow==='hidden'||!!document.querySelector('[role="dialog"][aria-modal="true"],[role="alertdialog"][aria-modal="true"]');
  const timer=window.setTimeout(async()=>{
   if(!active||ticket!==hoverAttempt.current||blocked()||!element.paused)return;
   hoverOwner.current={element,ticket};
   try{
    await element.play();
    if((!active||ticket!==hoverAttempt.current||blocked())&&hoverOwner.current?.ticket===ticket){element.pause();hoverOwner.current=null;}
   }catch{/* Hover is optional. Browser autoplay denial leaves the manual control available. */
    if(hoverOwner.current?.ticket===ticket)hoverOwner.current=null;
   }
  },150);
  const cancel=()=>{active=false;window.clearTimeout(timer);if(hoverOwner.current?.ticket===ticket)element.pause();};
  const guard=()=>{if(blocked())cancel();};
  const lock=new MutationObserver(guard);lock.observe(document.body,{attributes:true,attributeFilter:['data-scroll-locked','style']});
  document.addEventListener('visibilitychange',guard);document.addEventListener('focusin',guard);
  return()=>{cancel();lock.disconnect();document.removeEventListener('visibilitychange',guard);document.removeEventListener('focusin',guard);};
 },[hoverPreview,src]);
 const wave=useQuery({queryKey:['audio-preview-wave',src,waveformUrl,user?`${user.role}:${user.artistId??user.investorId}`:'guest'],queryFn:({signal})=>waveformLoader?waveformLoader(signal):apiRequest<Waveform>(waveformUrl!,{signal}),enabled:visible,staleTime:300000,retry:1});
 useEffect(()=>{if(error||(mediaReady&&(!!wave.data||wave.isError)))onReady?.();},[error,mediaReady,wave.data,wave.isError,onReady]);
 const length=duration||wave.data?.duration||0;
 function manual(){++hoverAttempt.current;hoverOwner.current=null;}
 async function toggle(){manual();const el=audio.current;if(!el)return;if(!el.paused){el.pause();return;}try{setError('');await el.play();}catch{setError('Could not play. Try again.');}}
 return <div className="audio-preview" ref={root} aria-label={`Audio preview: ${title}`} aria-busy={visible&&(!wave.data||!mediaReady)&&!wave.isError&&!error}>
  <p className="audio-preview-title">{title}</p>
  <div className="audio-preview-row"><button type="button" className="audio-preview-play" aria-label={`${playing?'Pause':'Play'} ${title}`} onClick={()=>void toggle()}>{playing?<Pause size={18}/>:<Play size={18}/>}</button>
   <div className="audio-preview-wave">{wave.data?<WaveformProgress data={wave.data} progress={length?position/length:0}/>:wave.isError?<div className="audio-preview-line"/>:<div className="audio-preview-skeleton" aria-hidden="true">{placeholderBars.map((height,index)=><span key={index} style={{height:`${height}%`}}/>)}</div>}<input aria-label={`Seek ${title}`} aria-valuetext={`${clock(position)} of ${clock(length)}`} type="range" min={0} max={length||1} step={.1} value={Math.min(position,length||1)} disabled={!length||!mediaReady} onChange={e=>{manual();if(audio.current&&mediaReady){audio.current.currentTime=Number(e.target.value);setPosition(Number(e.target.value));}}}/></div>
  </div><div className="audio-preview-time"><span>{clock(position)}</span><span>{length?clock(length):'—'}</span></div>
  {error&&<p role="alert" className="text-xs text-danger">{error} <button onClick={()=>{audio.current?.load();void toggle();}}>Retry</button></p>}
  {wave.isError&&<button className="text-xs text-muted underline" onClick={()=>void wave.refetch()}>Reload waveform</button>}
  <audio ref={audio} src={src} aria-label={`${title} preview audio`} preload={inView||hoverPreview?'auto':visible?'metadata':'none'} onLoadStart={()=>{setMediaReady(false);setDuration(0);}} onLoadedMetadata={()=>{setMediaReady(true);setDuration(Number.isFinite(audio.current?.duration)?audio.current!.duration:0);}} onTimeUpdate={()=>setPosition(audio.current?.currentTime??0)} onPlay={event=>setPlaying(!event.currentTarget.paused)} onPause={event=>{if(event.currentTarget.paused)setPlaying(false);}} onEnded={()=>setPlaying(false)} onError={()=>setError('Audio unavailable. Try again.')}/>
 </div>;
}
