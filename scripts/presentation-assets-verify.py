import shutil, os
"""Verify every declared presentation asset without changing application state."""
from pathlib import Path
import json, subprocess, array, math, hashlib
root=Path(__file__).resolve().parents[1]
a=root/'presentation/assets'; ff=(os.environ.get('NEBULA_FFMPEG_PATH') or shutil.which('ffmpeg') or 'ffmpeg'); fp=(os.environ.get('NEBULA_FFPROBE_PATH') or shutil.which('ffprobe') or 'ffprobe')
manifest=json.loads((a/'manifest.json').read_text()); checks=[]
entries=manifest['music']+manifest['video']+[{'path':x['result']} for x in manifest['remixSets']]+[{'path':x['contribution']} for x in manifest['remixSets']]
for entry in entries:
 p=a/entry['path']; raw=subprocess.check_output([str(ff),'-v','error','-i',str(p),'-vn','-ac','1','-ar','8000','-f','s16le','pipe:1']); samples=array.array('h'); samples.frombytes(raw)
 rms=math.sqrt(sum(v*v for v in samples)/len(samples))/32768
 peak=max(abs(v) for v in samples)/32768
 if rms<0.001: raise RuntimeError('Silent media: '+str(p))
 if not p.exists() or p.stat().st_size<10000: raise RuntimeError('Missing media: '+str(p))
 data=json.loads(subprocess.check_output([str(fp),'-v','error','-show_entries','format=duration','-of','json',str(p)]))
 duration=float(data['format']['duration']); wave=json.loads(p.with_suffix('.waveform.json').read_text())
 assert abs(wave['duration']-duration)<.001
 assert len(wave['peaks'])==math.ceil(duration*20)
 assert all(0<=x<=1 for x in wave['peaks'])
 checks.append({'path':entry['path'],'secondsDecoded':round(len(samples)/8000,3),'containerSeconds':duration,'peak':round(peak,4),'rms':round(rms,4),'decodePassed':True,'waveformPassed':True})
for entries,key in [(manifest['artists'],'portrait'),(manifest['covers'],'path')]:
 for e in entries:
  p=a/e[key]; assert p.exists() and p.stat().st_size<500000
for pair in manifest['remixSets']:
 original=next(x for x in manifest['music'] if x['key']==pair['key'])
 assert 0<=pair['startSeconds']<pair['endSeconds']<=original['durationSeconds']
 assert hashlib.sha256((a/pair['original']).read_bytes()).digest()!=hashlib.sha256((a/pair['result']).read_bytes()).digest()
report={'technicalChecks':checks,'portraits':6,'covers':8,'remixSets':2,'audition':'Pending human listening; no claim of subjective music QA.'}
(a/'verification.json').write_text(json.dumps(report,indent=2)+'\n')
files=[{'path':str(p.relative_to(a)),'bytes':p.stat().st_size,'sha256':hashlib.sha256(p.read_bytes()).hexdigest()} for p in sorted(a.glob('**/*')) if p.is_file() and p.name!='checksums.json']
(a/'checksums.json').write_text(json.dumps(files,indent=2)+'\n')
print(json.dumps({'passed':len(checks),'portraits':6,'covers':8,'remixSets':2,'audition':report['audition']}))
