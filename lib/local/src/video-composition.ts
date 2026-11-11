/** A focal position within the source's available crop, not a stretch or zoom. */
export type VideoFramePosition = { x: number; y: number };
export type VideoComposition = {
  version: 1;
  layout: 'vertical-split' | 'vertical-single';
  source: VideoFramePosition;
  contribution: VideoFramePosition;
};

export function defaultVideoComposition(sourceKind: 'audio' | 'video'): VideoComposition {
  return { version: 1, layout: sourceKind === 'video' ? 'vertical-split' : 'vertical-single', source: { x: .5, y: .5 }, contribution: { x: .5, y: .5 } };
}

/** Optional for historical drafts. Never silently coerce malformed persisted input. */
export function parseVideoComposition(value: unknown): VideoComposition | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid video framing.');
  const v = value as Record<string, unknown>;
  if (v.version !== 1 || !['vertical-split', 'vertical-single'].includes(v.layout as string)) throw new Error('Unsupported video framing.');
  const position = (raw: unknown): VideoFramePosition => {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new Error('Invalid video framing position.');
    const p = raw as Record<string, unknown>;
    if (![p.x, p.y].every(n => typeof n === 'number' && Number.isFinite(n) && n >= 0 && n <= 1)) throw new Error('Video framing positions must be between 0 and 1.');
    return { x: p.x as number, y: p.y as number };
  };
  return { version: 1, layout: v.layout as VideoComposition['layout'], source: position(v.source), contribution: position(v.contribution) };
}
