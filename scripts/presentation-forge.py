"""Add registered finished audio only; never rewrite posts, accounts or original media.
Run after backing up. Safe to repeat. FFmpeg runs here, never from Open Forge.
"""
import pathlib,sqlite3,json,hashlib,subprocess,shutil
root=pathlib.Path(__file__).resolve().parent.parent
manifest_path=root/'presentation/seed/manifest.json'
manifest=json.loads(manifest_path.read_text())
output=root/'presentation/assets/audio/afterglow-percussion-final.m4a'
if not output.exists():
    subprocess.run(['ffmpeg','-v','error','-nostdin','-i',str(root/'presentation/assets/video/afterglow-percussion-result.mp4'),'-map','0:a:0','-vn','-c:a','copy',str(output)],check=True)
assets=[(17,18,'luna-chilz-remix.m4a'),(4,7,'marea-remix.mp3'),(1,8,'afterglow-remix.mp3'),(15,16,'afterglow-percussion-final.m4a')]
registered=[]
for source,result,name in assets:
    path=root/'presentation/assets/audio'/name
    digest=hashlib.sha256(path.read_bytes()).hexdigest()
    probe=json.loads(subprocess.check_output(['ffprobe','-v','error','-show_entries','format=duration','-of','json',str(path)]))
    duration=float(probe['format']['duration'])
    entry={'name':name,'path':str(path.relative_to(root)),'sha256':digest}
    old=next((e for e in manifest['prepared'] if e['name']==name),None)
    if old and old!=entry:raise RuntimeError('Existing prepared file differs: '+name)
    if not old:manifest['prepared'].append(entry)
    dest=root/'.data/presentation/prepared'/name
    if dest.exists() and hashlib.sha256(dest.read_bytes()).hexdigest()!=digest:raise RuntimeError('Active file differs')
    if not dest.exists():shutil.copyfile(path,dest)
    registered.append((source,result,name,digest,duration))
for rel in ['.data/presentation/nebula.sqlite','.data/presentation/initial.sqlite','presentation/seed/scene.sqlite']:
    db=sqlite3.connect(root/rel)
    results=[]
    for source,result,name,digest,duration in registered:
        a=json.loads(db.execute('select data from posts where id=?',(source,)).fetchone()[0]);b=json.loads(db.execute('select data from posts where id=?',(result,)).fetchone()[0])
        assert b['remix']['sourceId']==source and a['status']==b['status']=='published'
        results.append(dict(sourceId=source,sourceMediaId=a['mediaId'],resultId=result,resultMediaId=b['mediaId'],filename=name,sha256=digest,duration=duration))
    value=json.dumps({'version':1,'results':results},separators=(',',':'))
    previous=db.execute("select value from presentation_settings where key='forge-results-v1'").fetchone()
    if not previous or previous[0]!=value:
        db.execute("insert into presentation_settings values('forge-results-v1',?) on conflict(key) do update set value=excluded.value",(value,));db.commit()
    db.close()
manifest['scene']['sha256']=hashlib.sha256((root/manifest['scene']['path']).read_bytes()).hexdigest()
manifest_path.write_text(json.dumps(manifest,indent=2)+'\n')
print('Registered 4 finished versions; existing accounts, posts and media unchanged.')
