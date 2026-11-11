"""Explicit build-time visual reference import. Never downloads Spotify audio."""
import concurrent.futures
import hashlib
import json
import re
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ARTIST = '1I6NepqGwgAF7Peq8F7clq'
# Verified against the artist's public Spotify discography, newest first.
RELEASES = [
    ('44OWJRy6K3WS7Kic6IiXQn', 'Single', 2023),
    ('76qj3Fto73wPoQtaKPHLBR', 'Single', 2023),
    ('0JfeZWbNiaj4eoZX4PgNFP', 'Single', 2023),
    ('2rXVXFO2squC3bbvEq7nce', 'Single', 2022),
    ('6jEQk9qkBabRIsua3GE6qq', 'EP', 2022),
    ('3YjHJtlVSSuYoHxmKzQ4wG', 'Single', 2022),
    ('3OLZTmaqj2LN2qKaNYc7Ns', 'Single', 2022),
    ('6cHjHvSRnpVzRymzz8lWCq', 'Single', 2022),
    ('4zVJvjgL8GnShIwHNPbxIK', 'Single', 2022),
    ('00ggWPaUoZijPC7UFiGlwi', 'Single', 2022),
]
ASSETS = ROOT / 'artifacts/nebula/public/presentation/chilz'

def read(url):
    with urllib.request.urlopen(url, timeout=30) as response:
        return response.read()

def entity(kind, identifier):
    page = read(f'https://open.spotify.com/embed/{kind}/{identifier}').decode()
    data = re.search(r'<script id="__NEXT_DATA__"[^>]*>(.*?)</script>', page)
    if not data:
        raise ValueError('Spotify public reference unavailable; no invented fallback.')
    return json.loads(data.group(1))['props']['pageProps']['state']['data']['entity']

def artwork(item, filename):
    images = item['visualIdentity']['image']
    source = max(images, key=lambda image: image.get('maxWidth', 0))['url']
    data = read(source)
    (ASSETS / filename).write_bytes(data)
    return {'path': f'/presentation/chilz/{filename}', 'source': source, 'sha256': hashlib.sha256(data).hexdigest()}

def release(spec):
    identifier, kind, year = spec
    value = entity('album', identifier)
    return {'spotifyId': identifier, 'title': value['name'], 'type': kind, 'year': year,
            'source': f'https://open.spotify.com/album/{identifier}',
            'artwork': artwork(value, identifier + '.jpg'),
            'tracks': [{'spotifyId': track['uri'].split(':')[-1], 'title': track['title'],
                        'artists': track['subtitle'].replace('\u00a0', ' '),
                        'durationSeconds': track['duration'] / 1000,
                        'explicit': track['isExplicit']} for track in value['trackList']]}

if __name__ == '__main__':
    ASSETS.mkdir(parents=True, exist_ok=True)
    artist = entity('artist', ARTIST)
    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
        releases = list(pool.map(release, RELEASES))
    value = {'version': 1, 'artistName': 'CHILZ', 'artistSpotifyId': ARTIST,
             'source': f'https://open.spotify.com/artist/{ARTIST}', 'verifiedOn': '2026-11-09',
             'audioIncluded': False, 'picture': artwork(artist, 'artist.jpg'), 'releases': releases}
    (ROOT / 'presentation/chilz-catalog.json').write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n')
    print(f"Imported {len(releases)} visual releases and {sum(len(r['tracks']) for r in releases)} tracks. No audio downloaded.")
