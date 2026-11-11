import { motion, useReducedMotion } from 'framer-motion';
import { AVATAR_VIEW, blobPath, eyeShapes, featureColor, mouthShape, seededAvatarParams, strokeWidth } from '@/lib/avatar';
import './thinking-loader.css';

const face = { ...seededAvatarParams('discovery-thinking'), face: '#cdf03f', eyes: 'bars' as const, mouth: 'open' as const };
const shape = blobPath(face.radii, face.wobble, face.scale);
const breathing = blobPath(face.radii.map(radius => 1 - radius), face.wobble * .8, face.scale);

export function DiscoveryThinkingLoader() {
  const reduced = useReducedMotion(), color = featureColor(face.face), mouth = mouthShape(face), stroke = strokeWidth(face);
  return <div className="discovery-thinking-loader" role="status" aria-label="Preparing Discovery">
    <span className="sr-only">Preparing your next sounds</span>
    <div className="discovery-thinking-character" aria-hidden="true">
      <motion.svg viewBox={`0 0 ${AVATAR_VIEW} ${AVATAR_VIEW}`} focusable="false" initial={false}
        animate={reduced ? {} : { y: [0, -4, -2, 0], rotate: [0, -2, 1, 0] }} transition={{ duration: 3.6, repeat: Infinity, ease: 'easeInOut' }}>
        <motion.path fill={face.face} initial={false} animate={{ d: reduced ? shape : [shape, breathing, shape] }} transition={{ duration: 3.6, repeat: Infinity, ease: 'easeInOut' }}/>
        <g className="discovery-thinking-gaze"><g className="discovery-thinking-blink">{eyeShapes(face).map((eye,index)=><path key={index} d={eye.d} fill={eye.stroke?'none':color} stroke={eye.stroke?color:undefined} strokeWidth={stroke} strokeLinecap="round"/>)}</g></g>
        {mouth&&<path d={mouth.d} fill={mouth.stroke?'none':color} stroke={mouth.stroke?color:undefined} strokeWidth={stroke} strokeLinecap="round"/>}
      </motion.svg>
    </div>
  </div>;
}
