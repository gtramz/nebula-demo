import { useEffect } from 'react';
/** One audible player across feed, profile, project, messages and studio. */
export function PlaybackCoordinator() {
  useEffect(()=>{
    const play=(event:Event)=>{
      const target=event.target;
      if(!(target instanceof HTMLMediaElement))return;
      // A delayed play event from an inactive/blocked feed item must not silence the visible one.
      if(target.dataset.playbackAllowed !== undefined && (target.dataset.playbackAllowed === 'false' || document.hidden)) { target.pause(); return; }
      document.querySelectorAll<HTMLMediaElement>('audio,video').forEach(media=>{if(media!==target&&!media.paused)media.pause();});
    };
    document.addEventListener('play',play,true);return()=>document.removeEventListener('play',play,true);
  },[]);
  return null;
}
