#!/usr/bin/env python3
"""Kanal /shorts sekmelerinden statik shorts.json üretir (GitHub Actions'ta periyodik çalışır).
Stream URL'si GÖMÜLMEZ (expire olur) — sadece id/başlık/kanal/kapak. Oynatma anında çözülür.
"""
import json
import random
import subprocess
import datetime
import os

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def shorts_from(url):
    try:
        p = subprocess.run(
            ['yt-dlp', '-J', '--no-playlist', '--flat-playlist',
             '--playlist-end', '10', '--socket-timeout', '15', url],
            capture_output=True, text=True, timeout=150)
        d = json.loads(p.stdout)
        ch = d.get('channel') or d.get('uploader') or ''
        out = []
        for e in d.get('entries', []) or []:
            if e and len(e.get('id', '')) == 11:
                out.append({
                    'id': e['id'],
                    'title': e.get('title') or 'Shorts',
                    'author': e.get('channel') or e.get('uploader') or ch,
                    'thumbnail': f"https://i.ytimg.com/vi/{e['id']}/hqdefault.jpg",
                    'short': True,
                })
        return out
    except Exception as ex:
        print('FAIL', url, str(ex)[:120])
        return []


def main():
    with open(os.path.join(BASE, 'tools', 'shorts-channels.txt')) as f:
        channels = [l.strip() for l in f if l.strip() and not l.startswith('#')]
    out = []
    for ch in channels:
        url = ch if ch.startswith('http') else f'https://www.youtube.com/{ch}/shorts'
        got = shorts_from(url)
        print(f'{ch}: {len(got)}')
        out.extend(got)
    seen, uniq = set(), []
    for v in out:
        if v['id'] not in seen:
            seen.add(v['id'])
            uniq.append(v)
    random.shuffle(uniq)
    data = {'updated': datetime.datetime.now(datetime.timezone.utc).isoformat(),
            'results': uniq[:200]}
    with open(os.path.join(BASE, 'shorts.json'), 'w') as f:
        json.dump(data, f, ensure_ascii=False)
    print(f"shorts.json: {len(data['results'])} video")


if __name__ == '__main__':
    main()
