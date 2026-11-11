import { describe, expect, it } from 'vitest';
import { angryAvatarParams, angryFeatures, blobPath, eyeShapes, featureColor, happyAvatarParams, seededAvatarParams } from '../../../artifacts/nebula/src/lib/avatar';

describe('Antiq blob geometry and identity', () => {
  it('uses the eight-segment silhouette and stable identity fallback', () => {
    const face = seededAvatarParams(19);
    expect(seededAvatarParams(19)).toEqual(face);
    expect(seededAvatarParams(20)).not.toEqual(face);
    expect(face.radii).toHaveLength(8);
    expect(face.radii.every(v => v >= 0 && v <= 1)).toBe(true);
    const path = blobPath(face.radii, face.wobble, face.scale);
    expect(path.match(/ C /g)).toHaveLength(8);
    expect(path).toMatch(/^M .+ Z$/);
    expect(path).not.toMatch(/NaN|undefined/);
  });
  it('keeps consecutive accepted faces distinct and dark colors readable', () => {
    let previous = happyAvatarParams();
    for (let i = 0; i < 20; i++) {
      const next = happyAvatarParams(previous);
      expect(next.face).not.toBe(previous.face);
      expect(next.eyes).not.toBe(previous.eyes);
      expect(next.mouth).toBe('smile');
      expect(eyeShapes(next)).toHaveLength(2);
      previous = next;
    }
    expect(featureColor('#2b3cff')).toBe('#f6f4ee');
    expect(featureColor('#cdf03f')).toBe('#0b0b0b');
  });
  it('distinguishes rejected actions by red face, bar eyes, brows and a frown', () => {
    const face = angryAvatarParams();
    expect(face.face).toBe('#ff5a3c');
    expect(face.eyes).toBe('bars');
    const features = angryFeatures(face);
    expect(features.brows).toHaveLength(2);
    expect(features.mouth).toContain(' Q ');
    const values = features.mouth.match(/[0-9.]+/g)!.map(Number);
    expect(values[3]).toBeLessThan(values[1]);
    expect(values[1]).toBe(values[5]);
  });
});
