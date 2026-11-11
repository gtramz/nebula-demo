// src/lib/avatar.ts

export const AVATAR_VIEW = 512;
export const POINTS = 8;

export type EyeStyle  = "bars" | "dots" | "sleepy" | "wink" | "side";
export type MouthStyle = "none" | "smile" | "open" | "flat";

export interface AvatarParams {
  /** 8 radius factors, each 0..1. 0.5 = perfect circle point. */
  radii:  number[];
  /** 0..1 — how far the shape strays from a circle. */
  wobble: number;
  /** Blob size relative to the 512×512 canvas. 0.86–1.0 works well. */
  scale:  number;
  face:   string; // CSS hex color for the blob fill
  bg:     string; // CSS hex color for the background (used in square exports)
  eyes:   EyeStyle;
  mouth:  MouthStyle;
}

// ── palette ──────────────────────────────────────────────────────────────────

export const BG_COLORS = [
  "#0b0b0b", // near-black
  "#f2efe6", // off-white
  "#e3d9bf", // warm sand
  "#ff5a3c", // orange-red
  "#2b3cff", // electric blue
  "#cdf03f", // yellow phospho
  "#c9b6f5", // lavender
  "#ffb02e", // amber
] as const;

export const FACE_COLORS = [
  "#0b0b0b",
  "#f2efe6",
  "#ff5a3c",
  "#2b3cff",
  "#ffb02e",
  "#cdf03f",
] as const;

export const EYE_STYLES:   EyeStyle[]   = ["bars", "dots", "sleepy", "wink", "side"];
export const MOUTH_STYLES: MouthStyle[] = ["none", "smile", "open", "flat"];

// ── internal helpers ──────────────────────────────────────────────────────────

function luminance(hex: string): number {
  const n = hex.replace("#", "");
  const r = parseInt(n.slice(0, 2), 16) / 255;
  const g = parseInt(n.slice(2, 4), 16) / 255;
  const b = parseInt(n.slice(4, 6), 16) / 255;
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function blobPoints(
  radii: number[], wobble: number, scale: number,
  cx: number, cy: number, base: number,
): Array<{ x: number; y: number }> {
  const pts = [];
  for (let i = 0; i < POINTS; i++) {
    const angle  = (i / POINTS) * Math.PI * 2 - Math.PI / 2;
    const factor = 1 + wobble * 0.26 * ((radii[i] ?? 0.5) * 2 - 1);
    const r = base * scale * factor;
    pts.push({ x: cx + Math.cos(angle) * r, y: cy + Math.sin(angle) * r });
  }
  return pts;
}

function barPath(cx: number, cy: number, w: number, h: number): string {
  const r      = w / 2;
  const top    = cy - h / 2 + r;
  const bottom = cy + h / 2 - r;
  return (
    `M ${(cx - r).toFixed(2)} ${top.toFixed(2)}` +
    ` A ${r.toFixed(2)} ${r.toFixed(2)} 0 0 1 ${(cx + r).toFixed(2)} ${top.toFixed(2)}` +
    ` L ${(cx + r).toFixed(2)} ${bottom.toFixed(2)}` +
    ` A ${r.toFixed(2)} ${r.toFixed(2)} 0 0 1 ${(cx - r).toFixed(2)} ${bottom.toFixed(2)}` +
    ` Z`
  );
}

function dotPath(cx: number, cy: number, r: number): string {
  return (
    `M ${(cx - r).toFixed(2)} ${cy.toFixed(2)}` +
    ` A ${r.toFixed(2)} ${r.toFixed(2)} 0 1 1 ${(cx + r).toFixed(2)} ${cy.toFixed(2)}` +
    ` A ${r.toFixed(2)} ${r.toFixed(2)} 0 1 1 ${(cx - r).toFixed(2)} ${cy.toFixed(2)}` +
    ` Z`
  );
}

function lidPath(cx: number, cy: number, w: number): string {
  return (
    `M ${(cx - w / 2).toFixed(2)} ${cy.toFixed(2)}` +
    ` Q ${cx.toFixed(2)} ${(cy + w * 0.7).toFixed(2)}, ${(cx + w / 2).toFixed(2)} ${cy.toFixed(2)}`
  );
}

// ── public API ────────────────────────────────────────────────────────────────

/**
 * Returns the SVG `d` attribute string for the blob outline.
 * The path always has the same structure (M + 8 C segments + Z),
 * which is what makes two blobs morphable between each other.
 */
export function blobPath(
  radii:  number[],
  wobble: number,
  scale:  number,
  cx   = AVATAR_VIEW / 2,
  cy   = AVATAR_VIEW / 2,
  base = AVATAR_VIEW * 0.335,
): string {
  const p = blobPoints(radii, wobble, scale, cx, cy, base);
  const n = p.length;
  const f = (v: number) => v.toFixed(2);
  let d = `M ${f(p[0]!.x)} ${f(p[0]!.y)}`;
  for (let i = 0; i < n; i++) {
    const p0 = p[(i - 1 + n) % n]!;
    const p1 = p[i]!;
    const p2 = p[(i + 1) % n]!;
    const p3 = p[(i + 2) % n]!;
    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C ${f(c1x)} ${f(c1y)}, ${f(c2x)} ${f(c2y)}, ${f(p2.x)} ${f(p2.y)}`;
  }
  return `${d} Z`;
}

export interface FeatureShape {
  d:       string;
  stroke?: boolean; // true = render as stroke (round caps), false/undefined = filled
}

/** Returns [leftEye, rightEye] path descriptors for the given eye style. */
export function eyeShapes(params: AvatarParams): FeatureShape[] {
  const c    = AVATAR_VIEW / 2;
  const u    = AVATAR_VIEW * 0.335 * params.scale;
  const offX = u * 0.34;
  const y    = c - u * 0.22;
  const barW = u * 0.13;
  const barH = u * 0.36;
  const dotR = u * 0.1;
  const lidW = u * 0.26;
  const side = params.eyes === "side" ? u * 0.16 : 0;
  const lx   = c - offX + side;
  const rx   = c + offX + side;

  switch (params.eyes) {
    case "dots":
      return [{ d: dotPath(lx, y, dotR) }, { d: dotPath(rx, y, dotR) }];
    case "sleepy":
      return [
        { d: lidPath(lx, y, lidW), stroke: true },
        { d: lidPath(rx, y, lidW), stroke: true },
      ];
    case "wink":
      // left = open bar, right = sleepy lid
      return [
        { d: barPath(lx, y, barW, barH) },
        { d: lidPath(rx, y, lidW), stroke: true },
      ];
    case "side":
    case "bars":
    default:
      return [
        { d: barPath(lx, y, barW, barH) },
        { d: barPath(rx, y, barW, barH) },
      ];
  }
}

/** Returns the mouth path descriptor, or null for `mouth: "none"`. */
export function mouthShape(params: AvatarParams): FeatureShape | null {
  const c = AVATAR_VIEW / 2;
  const u = AVATAR_VIEW * 0.335 * params.scale;
  const y = c + u * 0.3;
  switch (params.mouth) {
    case "smile":
      return {
        d: `M ${(c - u * 0.2).toFixed(2)} ${y.toFixed(2)}` +
           ` Q ${c.toFixed(2)} ${(y + u * 0.24).toFixed(2)}, ${(c + u * 0.2).toFixed(2)} ${y.toFixed(2)}`,
        stroke: true,
      };
    case "open":
      return { d: dotPath(c, y + u * 0.04, u * 0.11) };
    case "flat":
      return {
        d: `M ${(c - u * 0.16).toFixed(2)} ${y.toFixed(2)} L ${(c + u * 0.16).toFixed(2)} ${y.toFixed(2)}`,
        stroke: true,
      };
    default:
      return null;
  }
}

/** Stroke width for lines (eyes/mouth) proportional to blob size. */
export function strokeWidth(params: AvatarParams): number {
  return AVATAR_VIEW * 0.335 * params.scale * 0.11;
}

/**
 * Feature color that contrasts with the face.
 * Returns near-black on bright faces, off-white on dark faces.
 */
export function featureColor(face: string): string {
  return luminance(face) > 0.45 ? "#0b0b0b" : "#f6f4ee";
}

/** Generate 8 random radius factors for a new blob shape. */
export function randomRadii(): number[] {
  return Array.from({ length: POINTS }, () => Math.random());
}

/**
 * Generate a fully random set of AvatarParams.
 * Guarantees face is readable against background (luminance contrast ≥ 0.18).
 */
export function randomAvatarParams(): AvatarParams {
  let bg:   string = BG_COLORS[Math.floor(Math.random() * BG_COLORS.length)]!;
  let face: string = FACE_COLORS[Math.floor(Math.random() * FACE_COLORS.length)]!;
  let guard = 0;
  while (
    (face === bg || Math.abs(luminance(face) - luminance(bg)) < 0.18) &&
    guard < 12
  ) {
    face = FACE_COLORS[Math.floor(Math.random() * FACE_COLORS.length)]!;
    if (guard > 6) bg = BG_COLORS[Math.floor(Math.random() * BG_COLORS.length)]!;
    guard++;
  }
  const eyePool:   EyeStyle[]   = ["bars", "bars", "dots", "sleepy", "wink", "side"];
  const mouthPool: MouthStyle[] = ["none", "none", "none", "smile", "open", "flat"];
  return {
    radii:  randomRadii(),
    wobble: 0.45 + Math.random() * 0.4,
    scale:  0.86 + Math.random() * 0.14,
    face,
    bg,
    eyes:  eyePool[Math.floor(Math.random() * eyePool.length)]!,
    mouth: mouthPool[Math.floor(Math.random() * mouthPool.length)]!,
  };
}

/** Render the face as a static SVG string (no React, no animation). */
export function renderAvatarSvg(params: AvatarParams): string {
  const fg = featureColor(params.face);
  const sw = strokeWidth(params);
  const features = [
    ...eyeShapes(params),
    ...(mouthShape(params) ? [mouthShape(params)!] : []),
  ]
    .map((s) =>
      s.stroke
        ? `<path d="${s.d}" fill="none" stroke="${fg}" stroke-width="${sw.toFixed(2)}" stroke-linecap="round"/>`
        : `<path d="${s.d}" fill="${fg}"/>`,
    )
    .join("");
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${AVATAR_VIEW} ${AVATAR_VIEW}">` +
    `<rect width="${AVATAR_VIEW}" height="${AVATAR_VIEW}" fill="${params.bg}"/>` +
    `<path d="${blobPath(params.radii, params.wobble, params.scale)}" fill="${params.face}"/>` +
    features +
    `</svg>`
  );
}

/** Stable per identity; rendering must not change a person's fallback on refresh. */
export function seededAvatarParams(seed: string | number): AvatarParams {
  let state = 2166136261;
  for (const char of String(seed)) state = Math.imul(state ^ char.charCodeAt(0), 16777619);
  const next = () => { state = Math.imul(state, 1664525) + 1013904223 | 0; return (state >>> 0) / 4294967296; };
  const colors = FACE_COLORS.filter(color => color !== '#0b0b0b');
  return { radii: Array.from({ length: POINTS }, next), wobble: .42 + next() * .43, scale: .9,
    face: colors[Math.floor(next() * colors.length)]!, bg: '#0b0b0b', eyes: EYE_STYLES[Math.floor(next() * EYE_STYLES.length)]!, mouth: 'smile' };
}

export function happyAvatarParams(previous?: AvatarParams | null): AvatarParams {
  const colors = ['#ff5a3c', '#2b3cff', '#ffb02e', '#cdf03f'].filter(color => color !== previous?.face);
  const eyes = EYE_STYLES.filter(eye => eye !== previous?.eyes);
  return { radii: randomRadii(), wobble: .42 + Math.random() * .43, scale: .84 + Math.random() * .16,
    face: colors[Math.floor(Math.random() * colors.length)]!, bg: '#0b0b0b', eyes: eyes[Math.floor(Math.random() * eyes.length)]!, mouth: 'smile' };
}

export function angryAvatarParams(): AvatarParams {
  return { radii: randomRadii(), wobble: .55 + Math.random() * .3, scale: .86 + Math.random() * .14,
    face: '#ff5a3c', bg: '#0b0b0b', eyes: 'bars', mouth: 'flat' };
}

/** Unlike the compact error icon, a rejected action has brows and a true frown. */
export function angryFeatures(params: AvatarParams): { brows: string[]; mouth: string } {
  const c = AVATAR_VIEW / 2, u = AVATAR_VIEW * .335 * params.scale;
  return { brows: [
    `M ${c-u*.5} ${c-u*.63} L ${c-u*.18} ${c-u*.46}`,
    `M ${c+u*.18} ${c-u*.46} L ${c+u*.5} ${c-u*.63}`,
  ], mouth: `M ${c-u*.24} ${c+u*.48} Q ${c} ${c+u*.12}, ${c+u*.24} ${c+u*.48}` };
}
