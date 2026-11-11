import {useEffect,useRef,useState} from 'react';
import {useQuery} from '@tanstack/react-query';
import {apiRequest,type Waveform} from '@nebula/local';
import {Pause,Play} from 'lucide-react';
import {useAuth} from '@/context/AuthContext';
import {WaveformProgress} from '@/features/discovery/media-player';
const clock=(v:number)=>`${Math.floor(v/60)}:${String(Math.floor(v%60)).padStart(2,'0')}`;
/** One real media element, with waveform values decoded from this exact source. */
export function AudioPreview({src,title,waveformUrl,waveformLoader}:{src:string;title:string;waveformUrl?:string;waveformLoader?:(signal:AbortSignal)=>Promise<Waveform>}) {
 const {user}=useAuth();
 const audio=useRef<HTMLAudioElement>(null),root=useRef<HTMLDivElement>(null);
 const [visible,setVisible]=useState(false),[playing,setPlaying]=useState(false),[position,setPosition]=useState(0),[duration,setDuration]=useState(0),[error,setError]=useState('');
 useEffect(()=>{const el=root.current;if(!el)return;const observer=new IntersectionObserver(entries=>{if(entries.some(e=>e.isIntersecting)){setVisible(true);observer.disconnect();}},{rootMargin:'120px'});observer.observe(el);return()=>observer.disconnect();},[]);
 useEffect(()=>{const el=audio.current;const pause=()=>{if(document.hidden)el?.pause();};document.addEventListener('visibilitychange',pause);return()=>{el?.pause();document.removeEventListener('visibilitychange',pause);};},[src]);
 const wave=useQuery({queryKey:['audio-preview-wave',src,waveformUrl,user?`${user.role}:${user.artistId??user.investorId}`:'guest'],queryFn:({signal})=>waveformLoader?waveformLoader(signal):apiRequest<Waveform>(waveformUrl!,{signal}),enabled:visible,staleTime:300000,retry:1});
 const length=duration||wave.data?.duration||0;
 async function toggle(){const el=audio.current;if(!el)return;if(!el.paused){el.pause();return;}try{setError('');await el.play();}catch{setError('Could not play. Try again.');}}
 return <div className="audio-preview" ref={root} aria-label={`Audio preview: ${title}`}>
  <p className="audio-preview-title">{title}</p>
  <div className="audio-preview-row"><button type="button" className="audio-preview-play" aria-label={`${playing?'Pause':'Play'} ${title}`} onClick={()=>void toggle()}>{playing?<Pause size={18}/>:<Play size={18}/>}</button>
   <div className="audio-preview-wave">{wave.data?<WaveformProgress data={wave.data} progress={length?position/length:0}/>:<div className="audio-preview-line"/>}<input aria-label={`Seek ${title}`} aria-valuetext={`${clock(position)} of ${clock(length)}`} type="range" min={0} max={length||1} step={.1} value={Math.min(position,length||1)} disabled={!length} onChange={e=>{if(audio.current){audio.current.currentTime=Number(e.target.value);setPosition(Number(e.target.value));}}}/></div>
  </div><div className="audio-preview-time"><span>{clock(position)}</span><span>{length?clock(length):'—'}</span></div>
  {error&&<p role="alert" className="text-xs text-danger">{error} <button onClick={()=>{audio.current?.load();void toggle();}}>Retry</button></p>}
  {wave.isError&&<button className="text-xs text-muted underline" onClick={()=>void wave.refetch()}>Reload waveform</button>}
  <audio ref={audio} src={src} aria-label={`${title} preview audio`} preload={visible?'metadata':'none'} onLoadedMetadata={()=>setDuration(Number.isFinite(audio.current?.duration)?audio.current!.duration:0)} onTimeUpdate={()=>setPosition(audio.current?.currentTime??0)} onPlay={()=>setPlaying(true)} onPause={()=>setPlaying(false)} onEnded={()=>setPlaying(false)} onError={()=>setError('Audio unavailable. Try again.')}/>
 </div>;
}
