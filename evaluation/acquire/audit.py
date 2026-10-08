"""Audit acquired benchmark bytes and write a reviewable provenance snapshot."""
import collections, hashlib, json
from datetime import datetime, timezone
from pathlib import Path
from kinetics600 import ROOT, CACHE, MEDIA, META, CLASSES, BASE, SEED, quote, read_jsonl

def digest(path):
    with path.open('rb') as stream: return hashlib.file_digest(stream, 'sha256').hexdigest()

def main():
    records = read_jsonl(META / 'dataset.jsonl')
    if len(records) != 600: raise RuntimeError('Expected exactly 600 selected records')
    counts = collections.Counter(r['exercise'] for r in records)
    if any(counts[c] != 200 for c in CLASSES): raise RuntimeError('Expected exactly 200 per exercise')
    if len({r['sourceGroup'] for r in records}) != 600: raise RuntimeError('Duplicate source ID')
    if len({r['sha256'] for r in records}) != 600: raise RuntimeError('Duplicate selected media hash')
    # Only this script's own dataset-named unselected candidates can be moved.
    keep = {r['relativePath'] for r in records}
    for exercise in CLASSES:
        for path in (MEDIA / exercise).glob('*.mp4'):
            if path.relative_to(ROOT).as_posix() not in keep:
                destination = CACHE / 'unselected-candidates' / exercise / path.name
                destination.parent.mkdir(parents=True, exist_ok=True)
                if destination.exists():
                    if digest(destination) != digest(path): raise RuntimeError('Unselected cache name conflict')
                    path.unlink()
                else: path.rename(destination)
    for r in records:
        path = ROOT / r['relativePath']
        if digest(path) != r['sha256']: raise RuntimeError(f"Media hash changed: {r['id']}")
    source_files = []
    for exercise, label in CLASSES.items():
        path = CACHE / (exercise + '.tar.gz')
        source_files.append({'exercise': exercise, 'url': BASE + 'train/' + quote(label) + '.tar.gz',
                             'bytes': path.stat().st_size, 'sha256': digest(path)})
    for name, url in [
        ('k600-train.csv', BASE + 'annotations/train.csv'),
        ('countix.tar.gz', 'https://s3.amazonaws.com/kinetics/700_2020/annotations/countix.tar.gz'),
        ('deepmind-k600-annotations.tar.gz', 'https://storage.googleapis.com/deepmind-media/Datasets/kinetics600.tar.gz')]:
        path = CACHE / name
        if path.exists(): source_files.append({'url': url, 'bytes': path.stat().st_size, 'sha256': digest(path)})
    summary = {'auditedAt': datetime.now(timezone.utc).isoformat(), 'selectionSeed': SEED,
               'manifestPath': 'evaluation/manifests/dataset.jsonl',
               'manifestSha256': digest(META / 'dataset.jsonl'), 'records': len(records),
               'classes': dict(counts), 'distinctYoutubeIds': 600, 'distinctMediaSha256': 600,
               'localMediaFiles': len(list(MEDIA.rglob('*.mp4'))),
               'totalSelectedMediaBytes': sum(r['bytes'] for r in records),
               'allFullDecodeVerified': all(r.get('fullDecodeVerified') for r in records),
               'durationRangeSeconds': [min(r['duration'] for r in records), max(r['duration'] for r in records)],
               'resolutionRange': {'width': [min(r['width'] for r in records), max(r['width'] for r in records)],
                                   'height': [min(r['height'] for r in records), max(r['height'] for r in records)]},
               'developmentOnlyPilotIds': [r['id'] for r in records if r.get('developmentOnly')],
               'clipsWithCountixIntervals': sum(bool(r.get('countixIntervals')) for r in records),
               'clipsWithAtLeastOneWhollyPresentCountixInterval': sum(any(s['start'] >= 0 and s['end'] <= r['duration'] for s in r.get('countixIntervals', [])) for r in records),
               'expertFormLabels': sum(r['label'].get('form') is not None for r in records),
               'excludedCandidates': len(read_jsonl(META / 'acquisition-exclusions.jsonl')),
               'sources': source_files,
               'limitations': ['Distinct source IDs and exact hashes do not guarantee distinct people or exclude re-encoded reuploads.',
                              'No expert form-quality labels: this corpus cannot establish 80% form accuracy.',
                              'Source videos retain individual licenses; media remain local and must not be redistributed.']}
    target = ROOT / 'evaluation/acquire/acquisition-summary.json'
    target.write_text(json.dumps(summary, indent=2) + '\n', encoding='utf-8')
    print(json.dumps({k:v for k,v in summary.items() if k not in ('sources','developmentOnlyPilotIds')}, indent=2))

if __name__ == '__main__': main()
