import shutil, os
"""Local processing only: preserve generated native sound and combine actual inputs."""
from pathlib import Path
import json, subprocess, array, math, hashlib
root=Path(__file__).resolve().parents[1]; assets=root/'presentation/assets'; ff=(os.environ.get('NEBULA_FFMPEG_PATH') or shutil.which('ffmpeg') or 'ffmpeg'); fp=(os.environ.get('NEBULA_FFPROBE_PATH') or shutil.which('ffprobe') or 'ffprobe')
def run(args): subprocess.run([ff,'-v','error','-y',*map(str,args)],check=True)
def probe(p): return json.loads(subprocess.check_output([fp,'-v','error','-show_entries','format=duration:stream=codec_type,width,height','-of','json',str(p)]))
def wave(p):
 duration=float(probe(p)['format']['duration']);raw=subprocess.check_output([ff,'-v','error','-i',str(p),'-vn','-ac','1','-ar','8000','-f','s16le','pipe:1']);s=array.array('h');s.frombytes(raw)
 peaks=[round(max(map(abs,s[i:i+400]),default=0)/32768,5) for i in range(0,len(s),400)];peaks=(peaks+[0]*math.ceil(duration*20))[:math.ceil(duration*20)]
 p.with_suffix('.waveform.json').write_text(json.dumps({'version':1,'mediaId':p.stem,'duration':duration,'hasAudio':True,'pointsPerSecond':20,'peaks':peaks})+'\n')
 return {'file':str(p.relative_to(assets)),'duration':duration,'rms':math.sqrt(sum(v*v for v in s)/len(s))/32768,'peak':max(map(abs,s))/32768,'sha256':hashlib.sha256(p.read_bytes()).hexdigest(),'streams':probe(p)['streams']}
sets=[{'durationSeconds':7.8,'key':'marea-voice','owner':4,'contributor':2,'project':12,'work':4,'title':'Marea Alta · studio instrumental','resultTitle':'Marea Alta · Dante’s verse','need':'Verse','original':'video/marea-live-original.mp4','native':'video/marea-vocal-native.mp4','contribution':'video/marea-vocal-take.mp4','result':'video/marea-vocal-result.mp4','baseGain':.6,'contributionGain':.85,'sourceKind':'video','processId':'6fae21e0-747e-4b33-acf4-78fbd41dbd4c','credits':132},
{'durationSeconds':10,'key':'afterglow-percussion','owner':1,'contributor':5,'project':9,'work':1,'title':'Afterglow · rhythm sketch','resultTitle':'Afterglow · Inés on percussion','need':'Production','original':'audio/afterglow-rhythm-original.wav','native':'video/afterglow-percussion-native.mp4','contribution':'video/afterglow-percussion-take.mp4','result':'video/afterglow-percussion-result.mp4','baseGain':.65,'contributionGain':.85,'sourceKind':'audio','sourceExcerpt':{'path':'audio/afterglow.mp3','startSeconds':7.88,'reason':'Opening low-frequency attacks aligned with the first three native percussion transients.'},'processId':'0924e2db-839c-4bd1-b292-12c8b83cca25','credits':53}]
# The instrumental video keeps its own native soundtrack; never substitute the old dubbed session.
run(['-i',assets/'video/marea-performance-source.mp4','-t',7.8,'-vf','scale=720:1280','-af','afade=t=in:d=0.05,afade=t=out:st=7.65:d=0.15','-c:v','libx264','-preset','fast','-crf',20,'-c:a','aac','-b:a','192k','-movflags','+faststart',assets/sets[0]['original']])
run(['-ss',7.88,'-i',assets/'audio/afterglow.mp3','-t',10,'-af','afade=t=in:d=0.05,afade=t=out:st=9.85:d=0.15','-ar',48000,'-ac',2,'-c:a','pcm_s16le',assets/sets[1]['original']])
checks=[]
for s in sets:
 native=assets/s['native']
 if not native.exists(): print('Waiting for '+str(native));continue
 take=assets/s['contribution'];original=assets/s['original'];result=assets/s['result']
 run(['-i',native,'-t',s['durationSeconds'],'-vf','scale=720:1280','-af',f"volume=0.8,afade=t=in:d=0.03,afade=t=out:st={s['durationSeconds']-.15}:d=0.15",'-c:v','libx264','-preset','fast','-crf',20,'-c:a','aac','-b:a','192k','-movflags','+faststart',take])
 sound=f"[0:a]volume={s['baseGain']}[base];[1:a]volume={s['contributionGain']}[part];[base][part]amix=inputs=2:duration=first:normalize=0,alimiter=limit=0.89:level=0:latency=1[a]"
 if s['sourceKind']=='video':
  visual='[0:v]scale=720:320:force_original_aspect_ratio=decrease,pad=720:320:(ow-iw)/2:(oh-ih)/2:black[b];[1:v]scale=720:960:force_original_aspect_ratio=decrease,pad=720:960:(ow-iw)/2:(oh-ih)/2:black[c];[b][c]vstack=inputs=2[v]'
 else: visual='[1:v]null[v]'
 run(['-i',original,'-i',take,'-filter_complex',sound+';'+visual,'-map','[a]','-map','[v]','-t',s['durationSeconds'],'-c:v','libx264','-preset','fast','-crf',20,'-pix_fmt','yuv420p','-c:a','aac','-b:a','192k','-movflags','+faststart',result])
 for p in [original,take,result]: checks.append(wave(p))
 run(['-ss',2,'-i',take,'-frames:v',1,assets/f"video/{s['key']}-cover.jpg"])
 s.update(startSeconds=0,endSeconds=s['durationSeconds'],contributionKind='video',ready=True,recipe='Native generated sound preserved with short edge fades; actual sum of the named original and take at the declared gains, peak limited. No soundtrack replacement.',audition='Measured and frame-inspected; human listening not performed by the agent.')
(assets/'audiovisual-sets.json').write_text(json.dumps({'sets':sets,'checks':checks},indent=2)+'\n')
print(json.dumps({'completed':len(checks)//3,'files':checks},indent=2))
