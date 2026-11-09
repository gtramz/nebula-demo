import shutil, os
"""Create lightweight browser derivatives; keep generated PNG masters unchanged."""
from pathlib import Path
import json, subprocess
root = Path(__file__).resolve().parents[1]
assets = root / 'presentation/assets'
ffmpeg = (os.environ.get('NEBULA_FFMPEG_PATH') or shutil.which('ffmpeg') or 'ffmpeg')
manifest = json.loads((assets / 'manifest.json').read_text())
for kind, size in [('portraits', 512), ('covers', 768)]:
    for image in (assets / kind).glob('*.png'):
        out = image.with_suffix('.jpg')
        subprocess.run([str(ffmpeg), '-hide_banner', '-loglevel', 'error', '-y', '-i', str(image), '-vf', f'scale={size}:{size}:flags=lanczos', '-q:v', '3', '-frames:v', '1', str(out)], check=True)
        if out.stat().st_size >= 500_000:
            raise RuntimeError(f'Image too large: {out}')
for artist in manifest['artists']:
    artist['portrait'] = artist['portrait'].replace('.png','.jpg')
for cover in manifest['covers']:
    cover['path'] = cover['path'].replace('.png','.jpg')
(assets / 'manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2)+'\n')
print('Optimized 6 portraits and 8 covers:', sum(p.stat().st_size for p in assets.glob('*/*.jpg')), 'bytes total')
