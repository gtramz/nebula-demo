import { describe, expect, it } from 'vitest';
import { coverCrop, videoRegions } from './video-geometry';
import { defaultVideoComposition, parseVideoComposition } from '../../../../../lib/local/src/video-composition';

describe('vertical framing', () => {
  it('uses equal regions for two videos and full canvas for audio plus video', () => {
    expect(videoRegions('video', defaultVideoComposition('video')).map(r => [r.y, r.height])).toEqual([[0, 640], [640, 640]]);
    expect(videoRegions('audio', defaultVideoComposition('audio'))).toEqual([{ track: 'contribution', x: 0, y: 0, width: 720, height: 1280 }]);
    expect(videoRegions('video').map(r => r.height)).toEqual([320, 960]);
  });
  it.each([[1920,1080], [1080,1920], [1080,1080]])('fills both video regions without distortion for %ix%i', (width, height) => {
    for (const targetHeight of [640, 1280]) for (const p of [0, .5, 1]) {
      const crop = coverCrop(width, height, 720, targetHeight, {x:p,y:p});
      expect(crop.width / crop.height).toBeCloseTo(720 / targetHeight, 10);
      expect(crop.x).toBeGreaterThanOrEqual(0); expect(crop.y).toBeGreaterThanOrEqual(0);
      expect(crop.x + crop.width).toBeLessThanOrEqual(width + 1e-9);
      expect(crop.y + crop.height).toBeLessThanOrEqual(height + 1e-9);
      expect(Math.min(width - crop.width, height - crop.height)).toBeCloseTo(0, 9);
    }
  });
  it('moves only the crop across the available excess and centers predictably', () => {
    const left = coverCrop(1920,1080,720,640,{x:0,y:.5}), right = coverCrop(1920,1080,720,640,{x:1,y:.5}), center = coverCrop(1920,1080,720,640,{x:.5,y:.5});
    expect(left.x).toBe(0); expect(right.x + right.width).toBe(1920); expect(center.x).toBe(right.x / 2); expect(center.y).toBe(0);
  });
  it('accepts legacy omission, rejects invalid version/position, and drops unknown fields', () => {
    expect(parseVideoComposition(undefined)).toBeUndefined();
    const valid = defaultVideoComposition('video');
    expect(parseVideoComposition({...valid, url:'not a media reference'})).toEqual(valid);
    for (const invalid of [{...valid,version:2},{...valid,layout:'stretch'},{...valid,source:{x:-.1,y:0}},{...valid,contribution:{x:Infinity,y:.5}},{...valid,source:{x:'0.5',y:0}}]) expect(() => parseVideoComposition(invalid)).toThrow();
  });
});
