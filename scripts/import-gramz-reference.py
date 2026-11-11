"""Build-time import of verified public metadata and authorized clips. Never fetches catalog audio.
Input: yt-dlp --skip-download metadata in --catalog-input, selected clips + metadata in --clip-input.
Does not connect to or modify any database. Raw platform metadata stays outside the repository.
"""
import argparse, concurrent.futures, hashlib, json, re, subprocess, urllib.request
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
PUBLIC=ROOT/'artifacts/nebula/public/presentation/gramz'
MEDIA=ROOT/'presentation/assets/gramz'
SPOTIFY='https://open.spotify.com/artist/1izVY6m7Ez9wY6XGKvtIao'
YOUTUBE='https://www.youtube.com/@dongramzz'
SYNCUP='https://music.youtube.com/@syncupteam'
TIKTOK='https://www.tiktok.com/@dongramzz'
CLIPS=[('RMyx3zjScCU','Slow Rockstar · short 1','SmPvAfl91DU'),('C1Gdn_BhPd8','Slow Rockstar · short 2','SmPvAfl91DU'),('7475245924621487415','Hypnotized',None),('7470649012845088005','Náufrago',None),('7470346930036493574','WHY?','MyHE5p6v3-A'),('7442005875776163127','Midnight Monday','-5BKb8X811s'),('7429759582672588038','Falling','pBUF0vU9sb4'),('7428445230388776197','DVDs','nEdRR5pNzMc')]
def read(url):
 return urllib.request.urlopen(urllib.request.Request(url,headers={'User-Agent':'Mozilla/5.0'}),timeout=30).read()
def entity(kind,ident):
 page=read(f'https://open.spotify.com/embed/{kind}/{ident}').decode()
 return json.loads(re.search(r'<script id="__NEXT_DATA__"[^>]*>(.*?)</script>',page).group(1))['props']['pageProps']['state']['data']['entity']
def sha(path):return hashlib.sha256(path.read_bytes()).hexdigest()
def image(url,name):
 path=PUBLIC/name;path.write_bytes(read(url));return {'path':'/presentation/gramz/'+name,'source':url,'sha256':sha(path)}
def spotify(ident):
 e=entity('album',ident);url='https://open.spotify.com/album/'+ident
 schema=json.loads(re.search(r'<script type="application/ld\+json">(.*?)</script>',read(url).decode()).group(1))
 if 'single' not in schema['description'].lower():raise ValueError('Verify release format before importing')
 art=max(e['visualIdentity']['image'],key=lambda x:x.get('maxWidth',0))['url']
 return {'sourceId':ident,'sourcePlatform':'spotify','spotifyId':ident,'title':e['name'],'type':'Single','year':int(schema['datePublished'][:4]),'date':schema['datePublished'],'dateKind':'release','source':url,'artwork':image(art,ident+'.jpg'),'tracks':[{'sourceId':t['uri'].split(':')[-1],'sourcePlatform':'spotify','spotifyId':t['uri'].split(':')[-1],'title':t['title'],'artists':t['subtitle'],'durationSeconds':t['duration']/1000,'explicit':t['isExplicit']} for t in e['trackList']]}
def main():
 p=argparse.ArgumentParser();p.add_argument('--catalog-input',type=Path,required=True);p.add_argument('--clip-input',type=Path,required=True);p.add_argument('--ffmpeg',required=True);p.add_argument('--ffprobe',required=True);args=p.parse_args()
 PUBLIC.mkdir(parents=True,exist_ok=True);MEDIA.mkdir(parents=True,exist_ok=True)
 artist=entity('artist','1izVY6m7Ez9wY6XGKvtIao');picture=image(max(artist['visualIdentity']['image'],key=lambda x:x.get('maxWidth',0))['url'],'artist.jpg')
 releases=[spotify(i) for i in ['1BsDW5tAIl6I31Q2LLj9PX','3Az0m351SgNnS59agFixWP']]
 for file in sorted(args.catalog_input.glob('*.info.json')):
  m=json.loads(file.read_text());title=m['title']
  if 'gramz' not in title.lower() or 'luna' in title.lower():continue
  if m['id']=='0CZaQmK8GgI':
   releases[0]['alternateSources']=['https://www.youtube.com/watch?v='+m['id']];continue
  if not title.endswith('(Official Audio)'):raise ValueError('Unexpected catalog reference '+title)
  artists,song=title.removesuffix(' (Official Audio)').split('-',1);artists=artists.strip();song=song.strip()
  if '(with FD & Gramz)' in song:song='7PM';artists='paVlo, FD & Gramz'
  if song=='SLOW ROCKSTAR':song='Slow Rockstar'
  date=m['upload_date'];source='https://www.youtube.com/watch?v='+m['id']
  releases.append({'sourceId':m['id'],'sourcePlatform':'youtube','title':song,'type':'Video','formatLabel':'Official audio','dateKind':'upload','date':f'{date[:4]}-{date[4:6]}-{date[6:]}','year':int(date[:4]),'source':source,'sourceTitle':title,'artwork':image(m['thumbnail'],m['id']+'.jpg'),'tracks':[{'sourceId':m['id'],'sourcePlatform':'youtube','title':song,'artists':artists,'durationSeconds':m['duration'],'explicit':False}]})
 def clip(spec):
  ident,title,projectSourceId=spec;m=json.loads((args.clip_input/(ident+'.info.json')).read_text());source=args.clip_input/(ident+'.mp4');dest=MEDIA/(ident+'.mp4');cover=MEDIA/(ident+'.jpg')
  if 'luna' in m['title'].lower():raise ValueError('LUNA excluded')
  # Uniform browser-compatible transport. Preserve full frame, aspect, source audio and duration.
  subprocess.run([args.ffmpeg,'-v','error','-y','-i',str(source),'-map','0:v:0','-map','0:a:0','-vf',"scale=w='min(720,iw)':h=-2",'-c:v','libx264','-preset','fast','-crf','20','-pix_fmt','yuv420p','-c:a','aac','-b:a','160k','-movflags','+faststart',str(dest)],check=True)
  subprocess.run([args.ffmpeg,'-v','error','-y','-ss','1','-i',str(dest),'-frames:v','1','-q:v','2',str(cover)],check=True)
  probe=json.loads(subprocess.check_output([args.ffprobe,'-v','error','-show_format','-show_streams','-of','json',str(dest)]));v=next(s for s in probe['streams'] if s['codec_type']=='video');audio=next(s for s in probe['streams'] if s['codec_type']=='audio')
  platform='youtube' if len(ident)==11 else 'tiktok';url=('https://www.youtube.com/shorts/'+ident) if platform=='youtube' else TIKTOK+'/video/'+ident
  return {'sourceId':ident,'sourcePlatform':platform,'source':url,'sourceTitle':m['title'],'title':title,'projectSourceId':projectSourceId,'uploadedOn':m.get('upload_date'),'description':m.get('description',''),'durationSeconds':float(probe['format']['duration']),'width':v['width'],'height':v['height'],'audioCodec':audio['codec_name'],'videoCodec':v['codec_name'],'originalSha256':sha(source),'media':{'path':str(dest.relative_to(ROOT)),'sha256':sha(dest),'size':dest.stat().st_size},'cover':{'path':str(cover.relative_to(ROOT)),'sha256':sha(cover),'size':cover.stat().st_size}}
 with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:clips=list(pool.map(clip,CLIPS))
 assert len({c['originalSha256'] for c in clips})==len(clips),'Duplicate source files'
 releases.sort(key=lambda r:r['date'],reverse=True)
 manifest={'version':1,'artistName':'gramz','verifiedOn':'2026-11-10','source':SPOTIFY,'sources':[SPOTIFY,YOUTUBE,SYNCUP,TIKTOK],'picture':picture,'audioIncluded':False,'releases':releases,'clips':clips,'excluded':['All LUNA tracks and variants','No Pop on SyncUp Team: same work as Spotify; retained as alternate source','Works without verified participation by Gramz','Unselected repeated promotional clips'],'limitations':['Catalog is silent; only imported clips contain sound.','YouTube catalog dates describe uploads, not independently verified commercial release dates.','Unknown explicit-content status for YouTube catalog entries is not inferred.','Hypnotized and Náufrago remain independent posts: no verified catalog release was linked.']}
 (ROOT/'presentation/gramz-catalog.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
 print('Verified',len(releases),'catalog projects and',len(clips),'real clips; no LUNA import')
if __name__=='__main__':main()
