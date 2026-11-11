"""Repair only the named Marea presentation result. Originals and old results are retained.
Default updates the portable fixture; --data-dir applies the same idempotent update to an installed copy.
Requires a backup before applying to a live presentation. No networking or generation services.
"""
from pathlib import Path
import argparse, hashlib, json, sqlite3, shutil, uuid, subprocess, os
ROOT=Path(__file__).resolve().parents[1]
OLD='e8ba4a07-3386-4e43-bb29-746d39472430'
NEW=str(uuid.uuid5(uuid.NAMESPACE_URL,'nebula-demo:marea-vocal-split:v1'))
ASSET=ROOT/'presentation/assets/video/marea-vocal-split-v1.mp4'
COMPOSITION={'version':1,'layout':'vertical-split','source':{'x':.5,'y':.24},'contribution':{'x':.5,'y':.18}}

def update(path):
 c=sqlite3.connect(path);c.row_factory=sqlite3.Row
 try:
  with c:
   row=c.execute('SELECT * FROM posts WHERE id=14').fetchone();p=json.loads(row['data'])
   assert p['title']=='Marea Alta · Dante’s verse' and p['remix']['sourceId']==13
   assert p['mediaId'] in (OLD,NEW), 'Example was changed independently; refusing to overwrite it.'
   if p['mediaId']==NEW:
    assert p['remix'].get('composition')==COMPOSITION
    return
   old=c.execute('SELECT * FROM media WHERE id=?',(OLD,)).fetchone();assert old
   c.execute('INSERT INTO media VALUES(?,?,?,?,?,?,?)',(NEW,old['owner'],'video','video/mp4',ASSET.stat().st_size,old['created'],ASSET.name))
   p['mediaId']=NEW;p['remix']['composition']=COMPOSITION
   c.execute('UPDATE posts SET data=?,revision=revision+1 WHERE id=14',(json.dumps(p,ensure_ascii=False,separators=(',',':')),))
   # Only submissions that contain this exact demonstration result, not accounts or conversation text.
   for submission in c.execute('SELECT id,remix FROM collaboration_submissions WHERE media=?',(OLD,)).fetchall():
    attribution=json.loads(submission['remix']) if submission['remix'] else {'publicationId':14,'title':p['title'],'originalTitle':p['remix']['title'],'originalArtist':p['remix']['artistName']}
    attribution['composition']=COMPOSITION
    c.execute('UPDATE collaboration_submissions SET media=?,remix=? WHERE id=?',(NEW,json.dumps(attribution,ensure_ascii=False,separators=(',',':')),submission['id']))
    c.execute('UPDATE collaboration_files SET media=? WHERE submission=? AND media=?',(NEW,submission['id'],OLD))
 finally:c.close()

if __name__=='__main__':
 parser=argparse.ArgumentParser();parser.add_argument('--data-dir');parser.add_argument('--render',action='store_true');args=parser.parse_args()
 if args.render:
  ff=os.environ.get('NEBULA_FFMPEG_PATH') or shutil.which('ffmpeg')
  assert ff,'Install FFmpeg or set NEBULA_FFMPEG_PATH.'
  assets=ROOT/'presentation/assets/video'
  visual='[0:v]scale=720:640:force_original_aspect_ratio=increase,crop=720:640:(iw-ow)/2:(ih-oh)*0.24,setsar=1[b];[1:v]scale=720:640:force_original_aspect_ratio=increase,crop=720:640:(iw-ow)/2:(ih-oh)*0.18,setsar=1[c];[b][c]vstack=inputs=2[v]'
  subprocess.run([ff,'-v','error','-y','-i',str(assets/'marea-live-original.mp4'),'-i',str(assets/'marea-vocal-take.mp4'),'-i',str(assets/'marea-vocal-result.mp4'),'-filter_complex',visual,'-map','[v]','-map','2:a:0','-t','7.8','-c:v','libx264','-preset','fast','-crf','20','-pix_fmt','yuv420p','-c:a','copy','-movflags','+faststart',str(ASSET)],check=True)
 assert ASSET.exists()
 if args.data_dir:
  directory=Path(args.data_dir);(directory/'media').mkdir(exist_ok=True)
  shutil.copy2(ASSET,directory/'media'/NEW)
  for name in ['nebula.sqlite','initial.sqlite']:update(directory/name)
 else:
  scene=ROOT/'presentation/seed/scene.sqlite';update(scene)
  p=ROOT/'presentation/seed/manifest.json';m=json.loads(p.read_text())
  item={'id':NEW,'path':str(ASSET.relative_to(ROOT)),'sha256':hashlib.sha256(ASSET.read_bytes()).hexdigest()}
  m['media']=[x for x in m['media'] if x['id']!=NEW]+[item]
  m['scene']['sha256']=hashlib.sha256(scene.read_bytes()).hexdigest()
  with sqlite3.connect(scene) as c:m['counts']['media']=c.execute('SELECT count(*) FROM media').fetchone()[0]
  p.write_text(json.dumps(m,ensure_ascii=False,indent=2)+'\n')
 print(json.dumps({'mediaId':NEW,'composition':COMPOSITION,'asset':str(ASSET)}))
