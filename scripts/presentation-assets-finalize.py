import shutil, os
"""Bake local presentation media from generated audio and documented CC0 recordings.
No network calls or generation charges. All waveforms are measured from decoded PCM.
"""
from pathlib import Path
import json, subprocess, shutil, array, math, hashlib
ROOT = Path(__file__).resolve().parents[1]
A = ROOT / 'presentation/assets'
FF = (os.environ.get('NEBULA_FFMPEG_PATH') or shutil.which('ffmpeg') or 'ffmpeg')
FP = (os.environ.get('NEBULA_FFPROBE_PATH') or shutil.which('ffprobe') or 'ffprobe')
def run(args):
    subprocess.run([FF,'-hide_banner','-loglevel','error','-y',*map(str,args)],check=True)
def probe(path):
    return json.loads(subprocess.check_output([FP,'-v','error','-show_entries','format=duration:stream=codec_type,codec_name,sample_rate,channels,width,height','-of','json',str(path)]))
def waveform(path):
    duration=float(probe(path)['format']['duration'])
    raw=subprocess.check_output([FF,'-v','error','-i',str(path),'-map','0:a:0','-ac','1','-ar','8000','-f','s16le','pipe:1'])
    samples=array.array('h'); samples.frombytes(raw)
    peaks=[round(max((abs(v) for v in samples[i:i+400]),default=0)/32768,4) for i in range(0,len(samples),400)]
    peaks=(peaks+[0]*math.ceil(duration*20))[:math.ceil(duration*20)]
    target=path.with_suffix('.waveform.json')
    target.write_text(json.dumps({'version':1,'mediaId':path.stem,'duration':duration,'hasAudio':True,'pointsPerSecond':20,'peaks':peaks})+'\n')
    return duration, str(target.relative_to(A))
manifest=json.loads((A/'manifest.json').read_text())
# Preserve the actual generated sources so reruns never degrade them.
for key in ['afterglow','marea','glasshouse','concreto-contribution']:
    source=A/f'audio/sources/{key}-generated.mp3'
    if not source.exists(): shutil.copy2(A/f'audio/{key}.mp3',source)
specs=[
 ('afterglow','Afterglow','lia','R&B',88,'afterglow-generated.mp3',0,{'kind':'generated','provider':'Yapper','model':'Seed Audio 1.0','credits':0}),
 ('concreto','Concreto','dante','Hip-hop',None,'chill-lofi-inspired.mp3',10,{'kind':'CC0 excerpt','title':'Chill lofi inspired','author':'omfgdude','page':'https://opengameart.org/content/chill-lofi-inspired','download':'https://opengameart.org/sites/default/files/ChillLofiR_0.mp3','license':'https://creativecommons.org/publicdomain/zero/1.0/'}),
 ('lowtide','Low Tide','mara','Electronic',None,'november-snow.mp3',55,{'kind':'CC0 excerpt','title':'November Snow','author':'The Cynic Project / cynicmusic.com / pixelsphere.org','page':'https://opengameart.org/node/79558','download':'https://opengameart.org/sites/default/files/155%20November_snow-33_tape_leveled.mp3','license':'https://creativecommons.org/publicdomain/zero/1.0/'}),
 ('marea','Marea Alta','marea','House',120,'marea-generated.mp3',0,{'kind':'generated','provider':'Yapper','model':'Seed Audio 1.0','credits':0}),
 ('glasshouse','Glasshouse','ines','Jazz',84,'glasshouse-generated.mp3',0,{'kind':'generated','provider':'Yapper','model':'Seed Audio 1.0','credits':0}),
 ('meridian','Meridian','gael','Electronic',None,'space-ranger.mp3',0,{'kind':'CC0 excerpt','title':'Music loop, strong, downtempo, seamless','author':'Nostromo','page':'https://opengameart.org/content/music-loop-strong-downtempo-seamless','download':'https://opengameart.org/sites/default/files/space_ranger_seamless_loop_preview_no_watermark_0.mp3','license':'https://creativecommons.org/publicdomain/zero/1.0/'})
]
manifest['music']=[]
for key,title,artist,genre,bpm,source,offset,provenance in specs:
    out=A/f'audio/{key}.mp3'
    run(['-ss',offset,'-i',A/'audio/sources'/source,'-t','45','-af','afade=t=in:d=0.25,afade=t=out:st=43.5:d=1.5,loudnorm=I=-16:TP=-1.5:LRA=9','-ar','44100','-ac','2','-codec:a','libmp3lame','-b:a','192k',out])
    duration,wave=waveform(out)
    manifest['music'].append({'key':key,'title':title,'artist':artist,'genre':genre,'bpm':None,'targetBpm':bpm,'path':f'audio/{key}.mp3','durationSeconds':duration,'waveform':wave,'source':provenance,'ready':True})
manifest['remixSets']=[]
for key,source_artist,target_bpm,title in [('marea','marea',120,'Marea Alta — Inés Prado version'),('afterglow','lia',88,'Afterglow — Inés Prado version')]:
    contribution=A/f'audio/{key}-contribution.wav'
    # D minor sax phrase -> A minor; preserve pitch shift independently of tempo.
    pitch=2**(-5/12)
    tempo=(target_bpm/92)/pitch
    filters=f'asetrate={44100*pitch:.8f},aresample=44100,atempo={tempo:.8f},highpass=f=160,lowpass=f=9500,loudnorm=I=-20:TP=-3:LRA=9'
    adapted=A/f'audio/sources/{key}-adapted.wav'
    run(['-i',A/'audio/sources/concreto-contribution-generated.mp3','-af',filters,'-ar','44100','-ac','2','-c:a','pcm_s16le',adapted])
    run(['-i',adapted,'-af','asetpts=N/SR/TB,adelay=8000|8000,apad=whole_dur=45,atrim=duration=45,afade=t=out:st=43:d=2,asetpts=N/SR/TB','-t','45','-ar','44100','-ac','2','-c:a','pcm_s16le',contribution])
    result=A/f'audio/{key}-remix.mp3'
    run(['-i',A/f'audio/{key}.mp3','-i',contribution,'-filter_complex','[0:a]volume=0.76[base];[1:a]volume=0.42[part];[base][part]amix=inputs=2:duration=first:normalize=0,alimiter=limit=0.89:level=0[out]','-map','[out]','-t','45','-ar','44100','-ac','2','-c:a','libmp3lame','-b:a','192k',result])
    duration,result_wave=waveform(result)
    _,contribution_wave=waveform(contribution)
    manifest['remixSets'].append({'key':key,'title':title,'original':f'audio/{key}.mp3','contribution':f'audio/{key}-contribution.wav','result':f'audio/{key}-remix.mp3','sourceArtist':source_artist,'contributorArtist':'ines','bpm':None,'targetBpm':target_bpm,'startSeconds':0,'endSeconds':min(duration, next(t['durationSeconds'] for t in manifest['music'] if t['key']==key)),'durationSeconds':duration,'contributionOffsetSeconds':0,'musicalEntranceSeconds':8,'baseGain':0.76,'contributionGain':0.42,'waveform':result_wave,'contributionWaveform':contribution_wave,'recipe':'Actual mix of the linked original and adapted saxophone contribution; no replacement soundtrack. One generated sax performance is adapted separately for each song. Tempo/key targets follow generation briefs and require human audition.','ready':True})
# Performance footage is generated separately and installed by integrate-marea-video.py.
# Never replace it with a moving cover when rebuilding the audio catalogue.
for item in manifest.get('video', []):
    if item.get('key') == 'marea-session':
        assert (A/item['path']).exists(), 'The approved performance clip is missing.'
manifest['status']='ready-for-audition'
manifest['provenance']['music']='Three generated originals and one generated sax contribution via Yapper Seed Audio 1.0, zero credits. Three CC0 recordings complete the catalogue; full source metadata accompanies each track. Fictional profile assignment is presentation-only and is not a claim of actual authorship.'
manifest['generationFailures']=[{'key':key,'reason':'Provider content filter rejected a benign generation request. No bypass retry.','resolvedBy':'CC0 recording' if key!='marea-contribution' else 'Adapted successful sax contribution'} for key in ['concreto','lowtide','meridian','marea-contribution']]
manifest['limitations']=['Technical decoding, durations, measured waveforms and mix provenance are verified. Human musical audition is still required; this agent cannot hear audio input.','Target BPM/key are generation requests, not claims of verified musical analysis.','No missing playable catalogue media. Optional replacement of CC0 tracks or generated material remains available.']
(A/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
# A file-level manifest proves actual bytes and makes replacement auditable.
files=[]
for p in sorted(A.glob('**/*')):
    if p.is_file() and p.name not in ['checksums.json']:
        files.append({'path':str(p.relative_to(A)),'bytes':p.stat().st_size,'sha256':hashlib.sha256(p.read_bytes()).hexdigest()})
(A/'checksums.json').write_text(json.dumps(files,indent=2)+'\n')
print(json.dumps({'music':len(manifest['music']),'remixSets':len(manifest['remixSets']),'video':len(manifest['video']),'files':len(files),'status':manifest['status']}))
