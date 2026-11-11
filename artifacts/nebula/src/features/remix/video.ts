import type { RemixInput } from '@nebula/local';
import { drawFrame, videoRegions, VIDEO_WIDTH, VIDEO_HEIGHT } from './video-geometry';

export function recordingType() {
  if (!window.MediaRecorder || !HTMLCanvasElement.prototype.captureStream) throw new Error('Video remix recording is unavailable in this browser. Try a current browser with MediaRecorder and canvas capture support.');
  const mime = ['video/webm;codecs=vp8,opus', 'video/webm', 'video/mp4'].find(type => MediaRecorder.isTypeSupported(type));
  if (!mime) throw new Error('This browser cannot export a supported video format.');
  return mime;
}
function waitMedia(element: HTMLMediaElement, event: string, signal: AbortSignal, action: () => void) {
  return new Promise<void>((resolve, reject) => {
    const finish = (error?: Error) => { clearTimeout(timer); element.removeEventListener(event, done); element.removeEventListener('error', failed); signal.removeEventListener('abort', aborted); error ? reject(error) : resolve(); };
    const done = () => finish(), failed = () => finish(new Error('This media cannot be played. Try MP4/H.264, WebM, WAV or MP3.')), aborted = () => finish(new Error('Video preparation cancelled.'));
    const timer = setTimeout(() => finish(new Error('Media took too long to load. Try a smaller file.')), 15_000);
    element.addEventListener(event, done, { once: true }); element.addEventListener('error', failed, { once: true }); signal.addEventListener('abort', aborted, { once: true });
    if (signal.aborted) aborted(); else action();
  });
}
export async function inspectMedia(url: string, kind: 'audio' | 'video', max: number, signal: AbortSignal, knownDuration?: number) {
  const element = document.createElement(kind);
  try {
    element.preload = 'metadata';
    await waitMedia(element, 'loadedmetadata', signal, () => { element.src = url; });
    if (!Number.isFinite(element.duration) && !knownDuration) await waitMedia(element, 'seeked', signal, () => { element.currentTime = 1e9; });
    const duration = Number.isFinite(element.duration) ? element.duration : knownDuration;
    if (!duration || duration < .1 || duration > max) throw new Error(`Choose a file between 0.1 and ${max} seconds with duration metadata.`);
    if (element instanceof HTMLVideoElement && (!element.videoWidth || !element.videoHeight)) throw new Error('The file has no playable video track.');
    return duration;
  } finally { element.removeAttribute('src'); element.load(); }
}

// Real-time composition: no remote encoder, no second copy of the original is stored.
export async function renderVideo(options: {
  source: string; sourceKind: 'audio' | 'video'; contribution: string; contributionKind: 'audio' | 'video';
  settings: RemixInput; canvas: HTMLCanvasElement; signal: AbortSignal; progress: (percent: number) => void;
}): Promise<Blob> {
  const { settings, canvas, signal } = options, duration = settings.endSeconds - settings.startSeconds;
  if (duration < .1 - 1e-9 || duration > 60 + 1e-9 || settings.voiceOffset < 0 || settings.voiceOffset >= duration) throw new Error('Choose a valid fragment and contribution start time.');
  const mimeType = recordingType(), context = new AudioContext();
  const base = document.createElement(options.sourceKind), own = document.createElement(options.contributionKind);
  const media = [base, own]; let stream: MediaStream | null = null, interval: ReturnType<typeof setInterval> | undefined, recorder: MediaRecorder | undefined;
  const destination = context.createMediaStreamDestination(), limiter = context.createDynamicsCompressor();
  limiter.threshold.value = -3; limiter.knee.value = 0; limiter.ratio.value = 20; limiter.connect(destination);
  canvas.width = VIDEO_WIDTH; canvas.height = VIDEO_HEIGHT;
  const painter = canvas.getContext('2d'); if (!painter) { await context.close(); throw new Error('Video rendering is unavailable.'); }
  let ownStarted = false;
  const draw = () => {
    painter.fillStyle = '#080808'; painter.fillRect(0, 0, VIDEO_WIDTH, VIDEO_HEIGHT);
    for (const region of videoRegions(options.sourceKind, settings.composition)) {
      if (region.track === 'contribution' && !ownStarted) continue;
      const element = region.track === 'source' ? base : own;
      if (element instanceof HTMLVideoElement) drawFrame(painter, element, region, settings.composition?.[region.track]);
      // Preserve the previous rendering for drafts that have not opted into framing.
      if (!settings.composition) {
        painter.fillStyle = '#000b'; painter.fillRect(0, region.y, VIDEO_WIDTH, 40);
        painter.fillStyle = '#fff'; painter.font = '22px sans-serif';
        painter.fillText(options.sourceKind === 'audio' ? 'ANTIQ NEBULA · REMIX' : region.track === 'source' ? 'Original' : 'Your contribution', 20, region.y + 28);
      }
    }
  };
  const hidden = () => { if (document.hidden && recorder?.state === 'recording') recorder.stop(); };
  try {
    await context.resume();
    await Promise.all(media.map(async (element, index) => {
      if (element instanceof HTMLVideoElement) element.playsInline = true;
      element.preload = 'auto';
      await waitMedia(element, 'loadeddata', signal, () => { element.src = index ? options.contribution : options.source; element.load(); });
      const gain = context.createGain(); gain.gain.value = index ? settings.voiceGain : settings.baseGain;
      context.createMediaElementSource(element).connect(gain).connect(limiter);
    }));
    if (settings.startSeconds > 0) await waitMedia(base, 'seeked', signal, () => { base.currentTime = settings.startSeconds; });
    if (signal.aborted) throw new Error('Video preparation cancelled.');
    ownStarted = settings.voiceOffset === 0;
    draw(); stream = canvas.captureStream(30); destination.stream.getAudioTracks().forEach(track => stream!.addTrack(track));
    recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 2_500_000, audioBitsPerSecond: 128_000 });
    const rec = recorder, chunks: Blob[] = [];
    return await new Promise<Blob>((resolve, reject) => {
      let completed = false, settled = false, size = 0;
      const finish = (error?: Error) => {
        if (settled) return; settled = true; clearTimeout(timeout); signal.removeEventListener('abort', aborted);
        if (interval) clearInterval(interval); media.forEach(element => element.pause());
        if (rec.state !== 'inactive') rec.stop();
        if (error) reject(error); else resolve(new Blob(chunks, { type: rec.mimeType }));
      };
      const aborted = () => finish(new Error('Video preparation cancelled.'));
      const timeout = setTimeout(() => finish(new Error('Video playback stalled. Try a shorter clip or a different file.')), (duration + 20) * 1000);
      signal.addEventListener('abort', aborted, { once: true }); document.addEventListener('visibilitychange', hidden);
      rec.ondataavailable = event => { if (event.data.size) { chunks.push(event.data); size += event.data.size; if (size > 100 * 1024 * 1024) finish(new Error('The video exceeds 100 MB. Choose a shorter fragment.')); } };
      rec.onerror = () => finish(new Error('Video export failed. Try another format.'));
      rec.onstop = () => completed && chunks.length ? finish() : finish(new Error('Video export interrupted. Keep this tab visible and try again.'));
      base.onerror = own.onerror = () => finish(new Error('Media playback failed during export.'));
      base.onended = () => { if (base.currentTime >= settings.endSeconds - .15) { completed = true; rec.stop(); } else finish(new Error('The original ended before the selected fragment.')); };
      rec.start(250);
      // Start a zero-offset take with the base, not on the next paint interval.
      void Promise.all([base.play(), ...(ownStarted ? [own.play()] : [])]).catch(error => finish(error));
      interval = setInterval(() => {
        const elapsed = Math.max(0, base.currentTime - settings.startSeconds);
        if (!ownStarted && elapsed >= settings.voiceOffset) { ownStarted = true; void own.play().catch(error => finish(error)); }
        draw(); options.progress(Math.min(100, Math.round(elapsed / duration * 100)));
        if (elapsed >= duration && rec.state === 'recording') { completed = true; rec.stop(); }
      }, 1000 / 30);
    });
  } finally {
    document.removeEventListener('visibilitychange', hidden);
    if (interval) clearInterval(interval);
    if (recorder?.state === 'recording') recorder.stop();
    stream?.getTracks().forEach(track => track.stop()); destination.stream.getTracks().forEach(track => track.stop());
    media.forEach(element => { element.pause(); element.removeAttribute('src'); element.load(); });
    await context.close();
  }
}
