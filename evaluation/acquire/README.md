# Public exercise evaluation acquisition

The acquisition script collects **200 distinct source videos for each of pull-ups, push-ups and squats**, using the public Kinetics-600 research distribution hosted by the Computer Vision Data Foundation (CVDF). Raw videos and downloaded archives stay in the ignored `frontend/artifacts/evaluation/` directory. They are evaluation inputs, not product assets.

## Reproduce

Requires Python 3.11+, curl and FFmpeg. From the repository root:

```text
python evaluation/acquire/kinetics600.py --download --pilot --final --ffmpeg /path/to/ffmpeg
```

On this Windows workspace, `.tools/ffmpeg.exe` is detected automatically. Network access is required only for acquisition; the evaluation itself uses local media. Three archives require approximately 2.99 GB of transfer. Keep sufficient additional disk space for candidate media and the final subset. Downloads resume and completed archives are reused.

The script produces `evaluation/manifests/pilot.jsonl`, `dataset.jsonl`, and `acquisition-exclusions.jsonl`. The first two valid archive entries per class are fixed as development-only pilot sources **before any model result is seen**. Final selection includes these six pilot groups plus the first eligible sources under a deterministic SHA-256 ordering seeded with `aster-kinetics600-2026-10-08-v1`. No model output, visibility, apparent form quality or ease of analysis affects selection. Official action labels must match the exact original YouTube ID and clip boundaries. Eligibility is successful video decode, duration 2–120 seconds and resolution at least 240×180. Excluded candidates and reasons are retained.

The completed acquisition audit is in `evaluation/acquire/acquisition-summary.json`. It verifies 600 selected local files (830,007,621 bytes), all fully decoded and rehashed. There were 160 excluded ranked candidates: 98 without an exact matching record in the CVDF CSV, 60 below the resolution requirement, and two shorter than two seconds. CVDF identifies that annotation CSV as incomplete, so a missing annotation is not evidence of an incorrect action. This requirement and the minimum resolution narrow coverage; the subset is not an unbiased sample of every source archive entry.

After acquisition, run `python evaluation/acquire/audit.py` to verify all selected bytes and refresh the provenance snapshot. The analysis harness owns split assignment and its separate lock file; never regenerate or overwrite a locked manifest during a reported evaluation.

The final manifest contains 600 unique YouTube IDs and 600 unique raw-file SHA-256 hashes. Each complete dataset clip is used once, with no crops, repeated rep segments, augmentations or re-encodings counted as additional sources. Unselected candidates are moved outside the final media directory into the ignored cache. Grouping uses the original YouTube video ID, not a person or channel identity. Different IDs can feature the same person or channel, so this does not establish identity-disjoint or out-of-distribution generalization. Reuploads that have different encodings are not ruled out by exact hashing. Source-group splitting must happen before calibration, and pilot groups must remain in training. `sourceSplit: train` describes the original Kinetics split, not this project's evaluation split.

## Provenance and usage

- Official distribution: [CVDF Kinetics dataset repository](https://github.com/cvdfoundation/kinetics-dataset).
- Original dataset: Carreira et al., [A Short Note about Kinetics-600](https://arxiv.org/abs/1808.01340), 2018; Kay et al., [The Kinetics Human Action Video Dataset](https://arxiv.org/abs/1705.06950), 2017.
- Official annotation CSV: `https://s3.amazonaws.com/kinetics/600/annotations/train.csv`.
- Class archives: `https://s3.amazonaws.com/kinetics/600/train/pull%20ups.tar.gz`, `push%20up.tar.gz`, and `squat.tar.gz`.
- Original Google annotation package: `https://storage.googleapis.com/deepmind-media/Datasets/kinetics600.tar.gz`.
- Supplementary Countix annotations: `https://s3.amazonaws.com/kinetics/700_2020/annotations/countix.tar.gz`.

Kinetics annotation metadata is distributed under CC-BY-4.0. This does **not** mean the source videos are all Creative Commons. Google DeepMind explicitly states that [Kinetics videos retain their individual licenses](https://github.com/google-deepmind/tapnet#license-and-disclaimer). Individual video redistribution rights have not been verified. Keep media local for this research evaluation; do not commit, publish or bundle it in the app. The manifest records source IDs and URLs so source material and rights can be audited.

## What these labels can establish

Kinetics provides a human-annotated **action category**, not expert exercise-form ratings. Every record has `label.form: null`. Good/bad form accuracy, coaching safety and an 80% correct-form claim cannot be measured from these labels. Loaded squats and exercise variations may appear within broad action classes; they must not silently be treated as a single ideal movement template.

When an exact source-ID and clip-boundary match exists, `countixIntervals` preserves published repetition counts for their annotated subintervals. Those are not automatically whole-clip repetition totals, so the script does not invent `label.repCount`. Compare predictions on the specified intervals before reporting count accuracy. These are still not form-quality labels.

## Alternative datasets checked

- [UCF101](https://www.crcv.ucf.edu/research/data-sets/ucf101/): the official combined split lists contain 100 PullUps, 102 PushUps and 112 BodyWeightSquats clips. Each class has 25 source groups; clips within a group come from one longer video. It cannot alone supply 200 independent sources per exercise.
- [RepCount-A](https://svip-lab.github.io/dataset/RepCount_dataset.html): has repetition annotations and a public author distribution, but no general correct/incorrect-form labels. The authors state that original RepCount-B videos cannot be released; those were not acquired.
- [Fitness-AQA](https://github.com/ParitoshParmar/Fitness-AQA): offers expert form-error annotations for BackSquat, BarbellRow and OverheadPress, with noncommercial terms and an access-request form. It does not provide all three requested exercise categories; no access request or message was sent.

The reproducible subset is a heterogeneous source-video robustness benchmark. A separate independently annotated form-quality study remains necessary.
