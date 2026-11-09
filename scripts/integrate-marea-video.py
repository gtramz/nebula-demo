import shutil, os
"""Install the approved performance clip without reseeding the shared world.
Run after saving the generated source at presentation/assets/video/marea-performance-source.mp4.
"""
from pathlib import Path
import array, datetime, hashlib, json, math, shutil, sqlite3, subprocess, uuid
ROOT=Path(__file__).resolve().parents[1]
A=ROOT/'presentation/assets'; D=ROOT/'.data/presentation'
FF=(os.environ.get('NEBULA_FFMPEG_PATH') or shutil.which('ffmpeg') or 'ffmpeg'); FP=(os.environ.get('NEBULA_FFPROBE_PATH') or shutil.which('ffprobe') or 'ffprobe')
source=A/'video/marea-performance-source.mp4'; video=A/'video/marea-session.mp4'; poster=A/'video/marea-session.jpg'
def ff(*args): subprocess.run([str(FF),'-v','error','-y',*map(str,args)],check=True)
def probe(p): return json.loads(subprocess.check_output([str(FP),'-v','error','-show_entries','format=duration:stream=codec_type,width,height','-of','json',str(p)]))
assert source.exists(), 'Download the approved generated performance first.'
info=probe(source); duration=min(10,float(info['format']['duration']))
assert any(s['codec_type']=='video' for s in info['streams']) and duration>=5
# Use the actual Marea Alta recording, not the model's unrelated generated soundtrack.
ff('-i',source,'-ss',8,'-i',A/'audio/marea.mp3','-map','0:v:0','-map','1:a:0','-t',duration,'-c:v','libx264','-preset','fast','-crf',20,'-pix_fmt','yuv420p','-af',f'afade=t=in:d=0.06,afade=t=out:st={duration-.3}:d=0.3','-c:a','aac','-b:a','192k','-movflags','+faststart',video)
ff('-ss',2,'-i',video,'-frames:v',1,'-q:v',2,poster)
info=probe(video); duration=float(info['format']['duration']); stream=next(s for s in info['streams'] if s['codec_type']=='video')
assert any(s['codec_type']=='audio' for s in info['streams'])
raw=subprocess.check_output([str(FF),'-v','error','-i',str(video),'-ac','1','-ar','8000','-f','s16le','pipe:1']); samples=array.array('h'); samples.frombytes(raw)
peaks=[round(max(map(abs,samples[i:i+400]),default=0)/32768,4) for i in range(0,len(samples),400)]
peaks=(peaks+[0]*math.ceil(duration*20))[:math.ceil(duration*20)]
assert max(peaks)>.01, 'The soundtrack must be audible.'
mediaId=str(uuid.uuid5(uuid.NAMESPACE_URL,hashlib.sha256(video.read_bytes()).hexdigest())); coverId=str(uuid.uuid5(uuid.NAMESPACE_URL,hashlib.sha256(poster.read_bytes()).hexdigest()))
wave={'version':1,'mediaId':mediaId,'duration':duration,'hasAudio':True,'pointsPerSecond':20,'peaks':peaks}
video.with_suffix('.waveform.json').write_text(json.dumps(wave)+'\n')
backup=ROOT/'.data/video-backups'/datetime.datetime.now().strftime('%Y%m%d-%H%M%S');backup.mkdir(parents=True)
for name in ['nebula.sqlite','initial.sqlite']:
 db=sqlite3.connect(D/name); saved=sqlite3.connect(backup/name);db.backup(saved);saved.close()
 with db:
  row=db.execute('SELECT owner,data FROM posts WHERE id=11').fetchone();assert row and row[0]==4
  post=json.loads(row[1]);assert post['projectId']==12
  for path,mid,kind,mime in [(video,mediaId,'video','video/mp4'),(poster,coverId,'image','image/jpeg')]:
   shutil.copy2(path,D/'media'/mid)
   db.execute('INSERT OR IGNORE INTO media(id,owner,kind,mime,size,created,name) VALUES(?,?,?,?,?,?,?)',(mid,4,kind,mime,path.stat().st_size,int(datetime.datetime.now().timestamp()*1000),path.name))
  if post['mediaId']!=mediaId:
   post.update(title='Marea Alta — rooftop session',description='One more take before the city lights come on. Marea Alta, from our rooftop session.',mediaId=mediaId,coverId=coverId)
   db.execute('UPDATE posts SET data=?,revision=revision+1 WHERE id=11',(json.dumps(post),))
 db.close()
(D/'waveforms').mkdir(exist_ok=True);(D/'waveforms'/f'{mediaId}-v1.json').write_text(json.dumps(wave))
manifest=json.loads((A/'manifest.json').read_text())
manifest['video']=[{'key':'marea-session','title':'Marea Alta — rooftop session','artist':'marea','path':'video/marea-session.mp4','cover':'video/marea-session.jpg','music':'marea','durationSeconds':duration,'waveform':'video/marea-session.waveform.json','width':stream['width'],'height':stream['height'],'ready':True,'source':{'provider':'Yapper','model':'MiniMax H3 Singularity','processId':'87a731b2-c93d-4eba-b7a2-93b15f393e5e','credits':53,'soundtrack':'Marea Alta, original recording excerpt 8–18 seconds','kind':'generated performance footage'}}]
(A/'manifest.json').write_text(json.dumps(manifest,indent=2,ensure_ascii=False)+'\n')
jobPath=ROOT/'presentation/marea-video-job.json';job=json.loads(jobPath.read_text()) if jobPath.exists() else {};job.update(status='integrated',mediaId=mediaId,coverId=coverId,durationSeconds=duration);jobPath.write_text(json.dumps(job,indent=2)+'\n')
print(json.dumps({'mediaId':mediaId,'duration':duration,'width':stream['width'],'height':stream['height'],'backup':str(backup)}))
