"""Acquire a reproducible, source-grouped 200/class Kinetics-600 local benchmark.

Run from any directory with Python 3.11+ and FFmpeg. Media are never republished.
The model is not involved in eligibility or selection. --pilot creates six fixed
development-only records before selection; --final includes those IDs in the 600.
"""
from __future__ import annotations
import argparse, csv, hashlib, io, json, os, re, shutil, subprocess, tarfile
from pathlib import Path
from urllib.parse import quote
from urllib.request import Request, urlopen
from concurrent.futures import ThreadPoolExecutor

ROOT = Path(__file__).resolve().parents[2]
CACHE = ROOT / 'frontend/artifacts/evaluation'
MEDIA = CACHE / 'media'
META = ROOT / 'evaluation/manifests'
CLASSES = {'pullup': 'pull ups', 'pushup': 'push up', 'squat': 'squat'}
BASE = 'https://s3.amazonaws.com/kinetics/600/'
SEED = 'aster-kinetics600-2026-10-08-v1'
NAME = re.compile(r'^([A-Za-z0-9_-]{11})_(\d{6})_(\d{6})\.mp4$')
LICENSE = 'Kinetics annotation metadata: CC-BY-4.0; source video: individual original-owner license, not verified for redistribution; local evaluation only'

def write_jsonl(path, rows):
    path.parent.mkdir(parents=True, exist_ok=True)
    temp = path.with_suffix('.tmp')
    temp.write_text(''.join(json.dumps(r, ensure_ascii=False) + '\n' for r in rows), encoding='utf-8')
    temp.replace(path)

def read_jsonl(path):
    return [json.loads(x) for x in path.read_text(encoding='utf-8').splitlines() if x.strip()] if path.exists() else []

def download(url, target):
    target.parent.mkdir(parents=True, exist_ok=True)
    with urlopen(Request(url, method='HEAD'), timeout=45) as response:
        expected = int(response.headers['Content-Length'])
    if target.exists() and target.stat().st_size == expected: return
    if target.exists() and target.stat().st_size > expected: raise RuntimeError(f'Oversized cached archive: {target}')
    subprocess.run(['curl', '-L', '--fail', '--retry', '3', '--continue-at', '-', '--silent', '--show-error', url, '-o', str(target)], check=True)
    if target.stat().st_size != expected: raise RuntimeError(f'Incomplete download: {target}')

def annotations():
    path = CACHE / 'k600-train.csv'
    if not path.exists(): download(BASE + 'annotations/train.csv', path)
    with path.open(encoding='utf-8-sig', newline='') as f:
        rows = list(csv.DictReader(f))
    return {(r['youtube_id'], int(r['time_start']), int(r['time_end'])): r for r in rows}

def countix():
    path = CACHE / 'countix.tar.gz'
    if not path.exists(): return {}
    result = {}
    with tarfile.open(path) as archive:
        for member in archive.getmembers():
            if not member.name.endswith('.csv'): continue
            for r in csv.DictReader(io.StringIO(archive.extractfile(member).read().decode())):
                key = (r['video_id'], int(r['kinetics_start']), int(r['kinetics_end']))
                result.setdefault(key, []).append({
                    'start': float(r['repetition_start']) - key[1],
                    'end': float(r['repetition_end']) - key[1], 'count': int(r['count']),
                    'sourceFile': member.name,
                })
    return result

def inspect_video(path, ffmpeg, full=False):
    command = [ffmpeg, '-hide_banner', '-nostdin', '-threads', '1', '-i', str(path), '-map', '0:v:0', '-an']
    if not full: command += ['-frames:v', '1']
    command += ['-threads', '1', '-f', 'null', '-']
    p = subprocess.run(command, capture_output=True, text=True, encoding='utf-8', errors='replace', timeout=90)
    duration = re.search(r'Duration: (\d+):(\d+):(\d+(?:\.\d+)?)', p.stderr)
    stream = next((line for line in p.stderr.splitlines() if 'Stream #' in line and 'Video:' in line), '')
    size = re.search(r'(?<!\w)(\d{2,5})x(\d{2,5})(?!\w)', stream)
    if p.returncode or not duration or not size: raise ValueError('decode-or-metadata-failure')
    h, m, s = map(float, duration.groups()); duration = h * 3600 + m * 60 + s
    width, height = map(int, size.groups())
    if not 2 <= duration <= 120: raise ValueError('duration-outside-2-120s')
    if width < 240 or height < 180: raise ValueError('resolution-below-240x180')
    return {'duration': duration, 'width': width, 'height': height, 'fullDecodeVerified': full}

def record(exercise, basename, path, ann, counts, ffmpeg, pilot=False, full=False):
    match = NAME.fullmatch(basename)
    if not match: raise ValueError('invalid-dataset-filename')
    yt, start, end = match.groups(); key = (yt, int(start), int(end))
    if key not in ann or ann[key]['label'] != CLASSES[exercise]: raise ValueError('no-matching-official-action-annotation')
    info = inspect_video(path, ffmpeg, full)
    row = {'id': f'k600-{exercise}-{yt}-{start}-{end}', 'exercise': exercise,
           'sourceDataset': 'Kinetics-600', 'sourceGroup': yt, 'sourceUrl': f'https://www.youtube.com/watch?v={yt}',
           'archiveUrl': BASE + 'train/' + quote(CLASSES[exercise]) + '.tar.gz',
           'archiveMember': './' + basename, 'sourceSplit': 'train', 'sourceStart': int(start), 'sourceEnd': int(end),
           'license': LICENSE, 'relativePath': path.relative_to(ROOT).as_posix(),
           'sha256': hashlib.sha256(path.read_bytes()).hexdigest(), 'bytes': path.stat().st_size,
           'label': {'exercise': exercise, 'form': None}, **info}
    if pilot: row['developmentOnly'] = True
    if key in counts:
        row['countixIntervals'] = counts[key]
        row['countixNote'] = 'Counts apply only to these source-annotated subintervals. They are not full-clip repetition totals or form-quality labels.'
    return row

def extract_member(archive, member, exercise):
    basename = Path(member.name).name
    target = MEDIA / exercise / basename
    target.parent.mkdir(parents=True, exist_ok=True)
    if not target.exists() or target.stat().st_size != member.size:
        temp = target.with_suffix('.part')
        with archive.extractfile(member) as source, temp.open('wb') as output: shutil.copyfileobj(source, output)
        temp.replace(target)
    return target

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--download', action='store_true')
    parser.add_argument('--pilot', action='store_true')
    parser.add_argument('--final', action='store_true')
    parser.add_argument('--ffmpeg', default=str(ROOT / '.tools/ffmpeg.exe') if (ROOT / '.tools/ffmpeg.exe').exists() else 'ffmpeg')
    args = parser.parse_args()
    CACHE.mkdir(parents=True, exist_ok=True); META.mkdir(parents=True, exist_ok=True)
    if args.final and (META / 'dataset.jsonl.lock.json').exists():
        raise RuntimeError('This evaluation manifest is locked. Run audit.py to verify it; reproduce acquisition in a separate workspace rather than overwriting held-out splits.')
    if args.download:
        with ThreadPoolExecutor(max_workers=3) as pool:
            list(pool.map(lambda item: download(BASE + 'train/' + quote(item[1]) + '.tar.gz', CACHE / (item[0] + '.tar.gz')), CLASSES.items()))
        download('https://s3.amazonaws.com/kinetics/700_2020/annotations/countix.tar.gz', CACHE / 'countix.tar.gz')
    ann, counts = annotations(), countix()
    pilots = read_jsonl(META / 'pilot.jsonl')
    if args.pilot and not pilots:
        for exercise in CLASSES:
            n = 0
            with tarfile.open(CACHE / (exercise + '.tar.gz'), 'r|gz') as archive:
                for member in archive:
                    if not member.isfile() or not NAME.fullmatch(Path(member.name).name): continue
                    path = extract_member(archive, member, exercise)
                    try: row = record(exercise, path.name, path, ann, counts, args.ffmpeg, pilot=True)
                    except ValueError: continue
                    pilots.append(row); n += 1
                    if n == 2: break
            if n < 2: raise RuntimeError(f'Insufficient pilot clips: {exercise}')
        write_jsonl(META / 'pilot.jsonl', pilots)
        print('Pilot ready:', [(r['exercise'], r['id']) for r in pilots], flush=True)
    if not args.final: return
    selected, exclusions, used_ids, used_hashes = [], [], set(), set()
    for exercise in CLASSES:
        pilot_ids = {r['sourceGroup'] for r in pilots if r['exercise'] == exercise}
        with tarfile.open(CACHE / (exercise + '.tar.gz'), 'r:gz') as archive:
            members = [m for m in archive.getmembers() if m.isfile() and NAME.fullmatch(Path(m.name).name)]
            members.sort(key=lambda m: (NAME.fullmatch(Path(m.name).name)[1] not in pilot_ids,
                hashlib.sha256((SEED + ':' + exercise + ':' + NAME.fullmatch(Path(m.name).name)[1]).encode()).hexdigest(), m.name))
            # Pre-extract the ranked candidate pool in one sequential pass. Seeking
            # repeatedly backwards through gzip would decompress gigabytes per clip.
            wanted = {m.name for m in members[:300]}
            with tarfile.open(CACHE / (exercise + '.tar.gz'), 'r|gz') as sequential:
                for candidate in sequential:
                    if candidate.name in wanted: extract_member(sequential, candidate, exercise)
            selected_class = 0
            for member in members:
                basename = Path(member.name).name; yt = NAME.fullmatch(basename)[1]
                if yt in used_ids: exclusions.append({'exercise': exercise, 'member': member.name, 'reason': 'duplicate-original-youtube-id'}); continue
                path = extract_member(archive, member, exercise)
                try: row = record(exercise, basename, path, ann, counts, args.ffmpeg, pilot=yt in pilot_ids, full=True)
                except (ValueError, subprocess.TimeoutExpired) as error:
                    exclusions.append({'exercise': exercise, 'member': member.name, 'reason': str(error)}); continue
                if row['sha256'] in used_hashes: exclusions.append({'exercise': exercise, 'member': member.name, 'reason': 'byte-identical-source-media'}); continue
                selected.append(row); used_ids.add(yt); used_hashes.add(row['sha256']); selected_class += 1
                if selected_class % 25 == 0: print(exercise, selected_class, 'decoded/selected', flush=True)
                if selected_class == 200: break
            if selected_class != 200: raise RuntimeError(f'Only {selected_class} eligible distinct sources for {exercise}')
        write_jsonl(META / 'dataset.in-progress.jsonl', selected)
    if len(selected) != 600 or len(used_ids) != 600 or len(used_hashes) != 600: raise RuntimeError('Uniqueness invariant failed')
    write_jsonl(META / 'dataset.jsonl', selected)
    write_jsonl(META / 'acquisition-exclusions.jsonl', exclusions)
    # Keep the evaluation media directory exactly equal to the selected manifest.
    # Unselected candidate files remain in the ignored cache for audit/re-runs.
    keep = {r['relativePath'] for r in selected}
    for exercise in CLASSES:
        for path in (MEDIA / exercise).glob('*.mp4'):
            if NAME.fullmatch(path.name) and path.relative_to(ROOT).as_posix() not in keep:
                destination = CACHE / 'unselected-candidates' / exercise / path.name
                destination.parent.mkdir(parents=True, exist_ok=True)
                destination.write_bytes(path.read_bytes())
                path.unlink()
    print('Final manifest: 600 decode-verified clips, 200/class, 600 distinct YouTube IDs and file hashes.', flush=True)

if __name__ == '__main__': main()
