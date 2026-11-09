import { useEffect } from 'react';
/** One audible player across feed, profile, project, messages and studio. */
export function PlaybackCoordinator() {
  useEffect(()=>{
    const play=(event:Event)=>{
      const target=event.target;
      if(!(target instanceof HTMLMediaElement))return;
      document.querySelectorAll<HTMLMediaElement>('audio,video').forEach(media=>{if(media!==target&&!media.paused)media.pause();});
    };
    document.addEventListener('play',play,true);return()=>document.removeEventListener('play',play,true);
  },[]);
  return null;
}
