import type { VideoComposition, VideoFramePosition } from '@nebula/local';

export const VIDEO_WIDTH = 720, VIDEO_HEIGHT = 1280;
export type FrameRegion = { track: 'source' | 'contribution'; x: number; y: number; width: number; height: number };
export const clampPosition = (n: number) => Math.max(0, Math.min(1, n));

export function videoRegions(sourceKind: 'audio' | 'video', composition?: VideoComposition): FrameRegion[] {
  if (sourceKind === 'audio') return [{ track: 'contribution', x: 0, y: 0, width: VIDEO_WIDTH, height: VIDEO_HEIGHT }];
  const originalHeight = composition ? VIDEO_HEIGHT / 2 : 320;
  return [{ track: 'source', x: 0, y: 0, width: VIDEO_WIDTH, height: originalHeight }, { track: 'contribution', x: 0, y: originalHeight, width: VIDEO_WIDTH, height: VIDEO_HEIGHT - originalHeight }];
}

/** The same source rectangle is used by the framing canvas and the exported video. */
export function coverCrop(width: number, height: number, targetWidth: number, targetHeight: number, position: VideoFramePosition) {
  if ([width, height, targetWidth, targetHeight].some(n => !Number.isFinite(n) || n <= 0)) throw new Error('Video dimensions are unavailable.');
  const scale = Math.max(targetWidth / width, targetHeight / height);
  const cropWidth = targetWidth / scale, cropHeight = targetHeight / scale;
  return { x: (width - cropWidth) * clampPosition(position.x), y: (height - cropHeight) * clampPosition(position.y), width: cropWidth, height: cropHeight };
}

export function drawFrame(painter: CanvasRenderingContext2D, video: HTMLVideoElement, region: FrameRegion, position: VideoFramePosition | undefined) {
  if (video.readyState < 2 || !video.videoWidth || !video.videoHeight) return;
  if (position) {
    const crop = coverCrop(video.videoWidth, video.videoHeight, region.width, region.height, position);
    painter.drawImage(video, crop.x, crop.y, crop.width, crop.height, region.x, region.y, region.width, region.height);
  } else {
    // Legacy draft: preserve its historical contained composition until explicitly reframed.
    const scale = Math.min(region.width / video.videoWidth, region.height / video.videoHeight);
    const width = video.videoWidth * scale, height = video.videoHeight * scale;
    painter.drawImage(video, region.x + (region.width - width) / 2, region.y + (region.height - height) / 2, width, height);
  }
}
