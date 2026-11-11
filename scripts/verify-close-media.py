import shutil, os
from pathlib import Path
import subprocess,json,array,math,hashlib
root=Path(__file__).resolve().parents[1];a=root/'presentation/assets';ff=(os.environ.get('NEBULA_FFMPEG_PATH') or shutil.which('ffmpeg') or 'ffmpeg')
sets=json.loads((a/'audiovisual-sets.json').read_text())['sets'];out=[]
assert len(sets)==2 and all(s.get('ready') for s in sets)
def pcm(path):
 b=subprocess.check_output([ff,'-v','error','-i',str(a/path),'-vn','-ac','2','-ar','48000','-f','f32le','pipe:1']);s=array.array('f');s.frombytes(b);return s
for s in sets:
 if not s.get('ready'):continue
 base=pcm(s['original']);part=pcm(s['contribution']);mix=pcm(s['result']);n=min(len(base),len(part),len(mix))
 residual=[mix[i]-s['baseGain']*base[i] for i in range(n)];take=part[:n]
 dot=sum(x*y for x,y in zip(residual,take));corr=dot/math.sqrt(sum(x*x for x in residual)*sum(y*y for y in take))
 diff=math.sqrt(sum(x*x for x in residual)/n);assert corr>.8 and diff>.005,(s['key'],corr,diff)
 rms=math.sqrt(sum(x*x for x in mix)/len(mix));clipped=sum(abs(x)>=.999 for x in mix);assert clipped==0 and rms>.005
 motion=[]
 for p in [s['contribution'],s['result']]+([s['original']] if s['sourceKind']=='video' else []):
  md5=subprocess.check_output([ff,'-v','error','-i',str(a/p),'-an','-vf','fps=4,scale=64:114','-f','framemd5','pipe:1']).decode();frames=[x.split(',')[-1].strip() for x in md5.splitlines() if x and not x.startswith('#')];unique=len(set(frames));assert unique>20,(p,unique)
  motion.append({'file':p,'sampledFrames':len(frames),'distinctFrames':unique})
 out.append({'set':s['key'],'actualContributionResidualRms':diff,'residualCorrelationWithContribution':corr,'resultRms':rms,'clippedSamples':clipped,'motion':motion,'subjectiveListening':'Not performed; requires human audition. Native audio retained; no exact lip/finger synchronization certification.'})
(root/'.data/demo-close/audiovisual-verification.json').write_text(json.dumps(out,indent=2));print(json.dumps(out,indent=2))
