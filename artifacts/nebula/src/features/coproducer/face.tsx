import { AVATAR_VIEW, blobPath, eyeShapes, featureColor, mouthShape, strokeWidth, type AvatarParams } from '@/lib/avatar';

// Antiq's canonical black Blob Face preset, with the reference's two expressions.
const julio: AvatarParams = {
  radii: [.78, .3, .66, .24, .74, .38, .68, .28],
  wobble: .62, scale: .95, face: '#0b0b0b', bg: '#e3d9bf', eyes: 'bars', mouth: 'open',
};

/** Shared geometry keeps Julio consistent with Antiq's official Blob Faces. */
export function CoproducerFace({ smiling = false }: { smiling?: boolean }) {
  const params = smiling ? { ...julio, mouth: 'smile' as const } : julio;
  const foreground = featureColor(params.face), mouth = mouthShape(params);
  return <span className="coproducer-face" aria-hidden="true">
    <span className="coproducer-response"><svg viewBox={`0 0 ${AVATAR_VIEW} ${AVATAR_VIEW}`} focusable="false">
      <path d={blobPath(params.radii, params.wobble, params.scale)} fill={params.face} />
      <g className="coproducer-gaze"><g className="coproducer-blink">
        {eyeShapes(params).map((shape, i) => <path key={i} d={shape.d} fill={shape.stroke ? 'none' : foreground} stroke={shape.stroke ? foreground : undefined} strokeWidth={strokeWidth(params)} strokeLinecap="round" />)}
      </g></g>
      {mouth && <path className="coproducer-mouth" d={mouth.d} fill={mouth.stroke ? 'none' : foreground} stroke={mouth.stroke ? foreground : undefined} strokeWidth={strokeWidth(params)} strokeLinecap="round" />}
    </svg></span>
  </span>;
}
