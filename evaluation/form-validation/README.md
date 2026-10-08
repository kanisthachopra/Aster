# Exercise-form validation: feasibility and protocol

**Result: form accuracy is not currently calculable.** The app reports projected measurements, visibility, exploratory movement cycles, and suggestions to inspect movement. It does not output a repetition-level `correct/incorrect` decision or a named fault prediction. REHAB24-6's correctness labels therefore have no matching prediction to score. `usable`, `partial`, and `insufficient` describe available evidence, not exercise correctness.

This directory records a metadata-only diagnostic and a practical independent annotation protocol. **Zero REHAB videos were downloaded or inferred; no model was trained and no product weights were produced.** This is not a measured accuracy result or evidence that the coaching is clinically validated.

## What the published data can establish

The [official REHAB24-6 record](https://zenodo.org/records/13305826) supplies physiotherapist-supervised exercise recordings, paired camera views, repetition boundaries, binary correctness, capture conditions, and motion-capture data. Its [annotation semantics](https://zenodo.org/records/13305826/files/Segmentation.txt?download=1) define `correctness=1` as correct and `0` as incorrect. The CSV supplies no named fault, precise fault interval, severity, or correction-quality label. See the [associated paper](https://doi.org/10.1007/978-3-031-75823-2_2).

The following counts were computed from the complete official CSV, with no quality filtering:

| Exercise | Logical repetitions | Correct | Incorrect | Recordings | People |
| --- | ---: | ---: | ---: | ---: | ---: |
| Table/incline push-up, exercise 3 | 107 | 52 | 55 | 10 | 10 |
| Squat, exercise 6 | 195 | 134 | 61 | 9 | 9 |
| Combined | 302 | 186 | 116 | 19 | 10 unique |

Each repetition has two camera views. These are **302 repetitions, not 604 independent examples**. There is no pull-up coverage. Counts, condition breakdowns, source checksums, and audited app-source hashes are in [metadata-diagnostic.json](metadata-diagnostic.json).

| App output | Available independent reference | Valid evaluation |
| --- | --- | --- |
| Projected elbow/knee/body-line angles | Projected dataset joints or new manual joint annotations, after alignment and joint-definition checks | Continuous measurement error; no inference of correct form from angle accuracy |
| Chosen evidence frame and timestamp | Video/frame alignment plus independently annotated movement phase | Whether the displayed frame supports the stated observation; not a fault timestamp unless a fault was independently annotated |
| Visibility and capture limitation | Capture-condition labels plus independent per-frame visibility review | Coverage, abstention, and whether the stated limitation is supported |
| Exploratory cycle count | Published repetition boundaries after matching the complete interval | A separate repetition-count/localization evaluation; not correction accuracy |
| “Inspect/compare” movement suggestions | New blinded expert annotations and review | Whether the suggestion is relevant, supported, and appropriately qualified; a generic prompt is not a fault prediction |
| Future explicit correct/incorrect decision | Published correctness label at the same repetition unit | Binary form classification, only after adding and freezing an explicit decision contract |
| Future named fault and targeted correction | New independent fault and correction annotations | Fault precision/recall, localization, abstention, and correction appropriateness |

In particular, do not interpret the presence of a `body-line` finding as a detected fault, or an `insufficient` result as an incorrect exercise. A usable recording may show an incorrectly executed repetition.

## Research access and provenance

The [official API record](https://zenodo.org/api/records/13305826) identifies **CC BY-NC 4.0**. The record's description additionally restricts use to noncommercial research by academic or nonprofit organizations and requests citation. Preserve these conditions rather than relying on a third-party “CC0” claim. The [license](https://creativecommons.org/licenses/by-nc/4.0/) does not supply commercial product permission; organizational eligibility and the record's additional wording need resolution before using the media. No commercial rights are assumed here.

The public `videos.zip` archive is 2,651,613,914 bytes. Public availability establishes a potential research source, not a reason to download the archive when the current prediction/label contract cannot produce form accuracy. No signup, author contact, or access bypass was attempted. Future approved research media, annotations containing source rows, and caches belong in ignored `raw/`, `media/`, `private/`, or `cache/`; never in the shipped app. Do not train or distribute product weights from this noncommercial data.

Pinned source files from record 13305826:

| File | Bytes | Published MD5 |
| --- | ---: | --- |
| `Segmentation.csv` | 53,290 | `90b8fbd7445dd050bf27b17126c78fbe` |
| `Segmentation.txt` | 1,729 | `5f2a5b886c6f794f03e1a8f642738c86` |
| `videos.zip` | 2,651,613,914 | `ed183a245a1b171638e422f7a288e5a8` |

The source is credited to Andrej Černek, Jan Sedmidubsky, Petra Budikova, Miriama Jánošová, Lukáš Katzer, and Michal Procházka, REHAB24-6, [doi:10.5281/zenodo.13305826](https://doi.org/10.5281/zenodo.13305826). This repository includes our audit and aggregate counts, not the dataset media or full annotation CSV.

## Reproduce the diagnostic

From the repository root, with the official metadata and CSV already fetched into ignored artifacts:

```sh
node evaluation/form-validation/audit-metadata.mjs
```

Alternate local paths can be passed as the first two arguments: annotation CSV, then record JSON. The script verifies the pinned CSV checksum and license identifier, validates repetition IDs, computes the aggregates, records app-source hashes, and produces:

- `metadata-diagnostic.json`: public aggregate diagnostic with `formAccuracy: null` and the reason.
- `private/research-candidates.jsonl`: ignored source-derived candidate rows for a future annotation pilot, with `media_obtained: false` and `inference_run: false`.

The pilot selects two people with both correctness classes in both target exercises, then one repetition per person/exercise/class: **8 logical repetitions, 16 paired views**. It excludes flagged motion-capture errors and prefers illuminated recordings with fewer visible bystanders. This deliberately easy pilot is for checking annotation/alignment procedures, **not** a representative test set. Its people must remain in development if subsequently used. Selection is metadata-only; decoded media duration and frame indexing have not been verified.

## Limits and next valid experiment

Incline/table push-ups differ from the app's intended floor push-up capture. A correct incline repetition may fail the app's exercise/view gate; record this as variant-domain coverage, not a false form verdict. Squat views include frontal and oblique capture, whereas some projected joint measurements need a side view. Visibility, lighting, and another person in frame must be stratified rather than filtered away until the result looks better.

The dataset uses only ten people and instructed movements in a controlled setting. It cannot establish performance across the app's intended population, home/gym conditions, camera devices, loads, pain states, or pull-ups. Paired cameras, crops, and repetitions by one person must remain grouped. A correct whole-repetition label also does not mean every imaginable coaching suggestion is appropriate.

The next valid experiment is an independent annotation pilot following [annotation-rubric.md](annotation-rubric.md), using [annotation-template.csv](annotation-template.csv). Resolve research-use eligibility, inspect archive paths without guessing them, verify alignment, then schedule inference separately from the ongoing core benchmark. Freeze the app and rubric before collecting results. Measure the claims it actually makes; add a separate, explicit form-prediction contract only if a future product version is intended to make that claim.

## Additional form-quality sources checked on 2026-10-08

These checks inspected primary publications, public file inventories, license files, and small annotation downloads. They did not modify the locked 600-video benchmark, download exercise media or weights, run inference, contact authors, sign agreements, or create accounts. “Published results” and “publicly downloadable labeled examples” are deliberately distinguished.

| Source | Relevant exercise coverage | Actual access established | Evaluation readiness |
| --- | --- | --- | --- |
| FitAQA | Push-up, knee push-up, squat; no pull-up in the complete action list | Public annotation Parquet files downloaded and verified; videos explicitly excluded | Strong candidate for named aspects and fault intervals after lawful source-media recovery and an explicit matching prediction contract |
| `pullup-detection-ai` | Pull-up implementation; README also describes push-ups, but inspected push-up processor files are empty; no squat implementation found | Public code, demo imagery and four model-weight release assets; no raw evaluation set or ground-truth annotation manifest found | Implementation reference, **not an available independent form benchmark** |
| ExeCheck / ExeChecker | Squat and side-step squat; neither push-up nor pull-up in its ten-exercise list | Official page links a public Dropbox folder and describes RGB-D videos/joints/segmentation; folder HTML returned HTTP 200, but usable listing and file downloads were not verified | Potential squat research source; data-file access and dataset license remain unresolved |

### FitAQA: real annotations, separate media permissions

The [official release](https://huggingface.co/datasets/Kelly0510/FitAQA) publishes 5,124 perception/judgement questions and 388 temporal-grounding questions. Its [manifest](https://huggingface.co/datasets/Kelly0510/FitAQA/blob/main/manifest.json) and two Parquet files were accessible without authentication. The release uses [Apache-2.0](https://huggingface.co/datasets/Kelly0510/FitAQA/blob/main/LICENSE), but explicitly excludes video redistribution and preserves each original provider's terms.

**Label trap:** `form_error` identifies the assessed aspect, not necessarily a fault present in that example. For multiple-choice rows, use the actual `gold` and `correct_form_option`; their equality indicates the correct-execution answer for that aspect. Do not mark every nonempty `form_error` row as incorrect. Grounding rows instead provide an error description and time intervals. Keep question pairs and shared videos grouped. A review prompt emitted by this app is still not an answer to those questions.

The [paper's complete action table and annotation procedure](https://arxiv.org/html/2608.08736v2#A1) establish push-up, knee push-up, and squat coverage, with no pull-ups. Sports students annotated videos and experts reviewed them; question generation also involved language models followed by expert verification. This is richer fault evidence than REHAB's binary labels, but not a clinical outcome validation.

Direct download verification at commit `eec7c3be769f038889a05e1ac81a93b0cf2513fd`:

| Public file | Downloaded bytes | SHA-256 verified against release manifest |
| --- | ---: | --- |
| [Multiple-choice annotations](https://huggingface.co/datasets/Kelly0510/FitAQA/blob/main/data/multiple_choice/test-00000-of-00001.parquet) | 179,533 | `26fe661c5054dc64d9bb3b7ec267fc533ed3952907b8ffa763339b8328db461f` |
| [Temporal annotations](https://huggingface.co/datasets/Kelly0510/FitAQA/blob/main/data/temporal_grounding/test-00000-of-00001.parquet) | 29,685 | `5d2471fb599f627b56ad70d1880c65221571d97d538e24bf6ff01cc21826830f` |

These files are retained only in ignored `private/`. The API reports the repository public and ungated. The dataset-server preview timed out, so the following census was computed locally from the checksum-verified Parquet files instead.

#### Exact FitAQA target-exercise census

The [aggregate audit](fitaqa-coverage.json) records the decoder version, file hashes, source breakdowns, and consistency checks. A unique asset means the pair `(dataset, video_name)`, not a person or an independent repetition. Short assets include UCF101 frame-sequence directories.

| Exercise | Unique short assets | Question instances | Perception / judgement pairs | Error-aspect judgements | Correct-aspect judgements |
| --- | ---: | ---: | ---: | ---: | ---: |
| Push-up | 82 | 166 | 83 | 55 | 28 |
| Knee push-up | 83 | 166 | 83 | 49 | 34 |
| Squat | 96 | 224 | 112 | 68 | 44 |
| Total | **261** | **556** | **278** | **172** | **106** |

There are 54 push-up, 49 knee push-up, and 52 squat assets with at least one error-aspect judgement: **155 assets**, not 172 independent faulty repetitions. The other 106 assets have only correct answers among their released assessed aspects; this does not establish globally correct form. Of the 261 assets, 229 have video hashes and 32 are unhashed frame sequences. Both the question-pair answer consistency and all valid option references were checked.

Source breakdown for the short-clip questions:

| Exercise | Source | Unique assets | Questions | Error / correct judgements |
| --- | --- | ---: | ---: | ---: |
| Push-up | QEVD-FIT-300k | 39 | 80 | 27 / 13 |
| Push-up | EgoExo-Fitness | 30 | 60 | 21 / 9 |
| Push-up | UCF101 | 13 | 26 | 7 / 6 |
| Knee push-up | QEVD-FIT-300k | 49 | 98 | 33 / 16 |
| Knee push-up | EgoExo-Fitness | 33 | 66 | 16 / 17 |
| Knee push-up | UCF101 | 1 | 2 | 0 / 1 |
| Squat | QEVD-FIT-300k | 51 | 134 | 52 / 15 |
| Squat | Kinetics-700 | 27 | 54 | 14 / 13 |
| Squat | UCF101 | 18 | 36 | 2 / 16 |

The temporal-grounding subset has actual annotated error intervals:

| Exercise | Processed clips | Parent workout IDs | Questions | Annotated intervals across questions |
| --- | ---: | ---: | ---: | ---: |
| Push-up | 17 | 17 | 20 | 22 |
| Knee push-up | 0 | 0 | 0 | 0 |
| Squat | 9 | 9 | 10 | 17 |
| Deduplicated total | **26** | **25** | **30** | **39** |

Parent workout IDs are derived from the release's documented `source_stem_NN.mp4` convention; the original media was not inspected. One parent workout contributes both target exercises, so its count is not additive. Intervals belonging to different questions can overlap and are not independent repetitions. Push-up temporal clips come from COACH/Benchmark/Competition in counts 4/2/11; squat clips in counts 2/3/4. Across the two configurations there are **287 unique referenced assets and 586 question instances** for these three exercises. Neither complete decoded configuration includes pull-ups.

An additional label caveat emerged in the decoded rows: some questions combine several `form_error` labels. Even when `gold != correct_form_option`, **not every label in that list is necessarily present**. For example, one shoulder-blade question offers separate combinations of shoulder elevation and protraction. A future individual-fault evaluation must interpret the selected perception option through a reviewed mapping, rather than mark both faults positive. The audit names these lists `assessedLabelsOnErrorAnswerRows`, not confirmed fault labels.

Reproduction uses `hyparquet@1.31.3` with Node `v24.16.0` and built-in ZSTD, installed only under ignored `private/decoder` with lifecycle scripts disabled. With the two pinned files already in `private/`:

```sh
npm install --prefix evaluation/form-validation/private/decoder --ignore-scripts --no-audit --no-fund hyparquet@1.31.3
node evaluation/form-validation/audit-fitaqa.mjs
```

The audit checks the full release totals (5,512 questions, 2,219 referenced assets), unique question IDs, paired-answer agreement, option validity, and temporal bounds before writing aggregate counts. It does not assess our app's accuracy or download media.

#### Overlap with the locked 600-video benchmark

A separate [aggregate overlap audit](fitaqa-overlap.json) compared the 255 hashed target assets with the locked manifest and checked the 27 Kinetics-700 squat source IDs against its Kinetics-600 source groups. It projected only `dataset`, `video_name`, `video_sha256`, and `action_name`; it did not read FitAQA fault/answer columns, core predictions, or video frames. The 32 unhashed UCF frame-sequence assets cannot be compared by byte hash and do not provide a comparable original YouTube ID here.

| Locked split | Exact SHA-256 matches | Source-ID-only candidates | Of those, same nominal time bounds |
| --- | ---: | ---: | ---: |
| Train | 0 | 1 squat | 1 |
| Validation | 0 | 0 | 0 |
| Test | 0 | 1 squat | 1 |
| Total | **0** | **2 squats** | **2** |

The two source IDs and nominal clip intervals match, but **the video hashes do not**. They are identity/alignment candidates only; this does not authorize transferring any form labels. Frame selection, trimming, or encoding may differ, and none was inspected. A future separately planned identity check could investigate the training candidate using existing media. The test candidate stays held out; no groups were moved or labels joined. This audit does not establish usable local form-ground-truth coverage.

Reproduce with `node evaluation/form-validation/audit-fitaqa-overlap.mjs` after preparing the same local decoder and metadata. The script verifies the canonical locked-manifest hash `c72e3e69e87fc1cc4f54296a8f39d30001c255a689f41e525267e1d6f019121e` and verifies the file bytes remain unchanged after the check. Its output contains aggregate counts only, never candidate identities or held-out fault labels.

Media access is a separate dependency:

- **QEVD:** [Official downloads](https://www.qualcomm.com/developer/software/qevd-dataset/downloads) list multipart short-video archives and COACH archives. [Download instructions](https://www.qualcomm.com/content/dam/qcomm-martech/dm-assets/documents/QSC-QEVD-FIT-COACH-Dataset-Download-Instructions.pdf) describe roughly 10 GB split files and 1.4–4 GB COACH archives; none were downloaded or tested end-to-end. The linked [research-use agreement](https://www.qualcomm.com/content/dam/qcomm-martech/dm-assets/documents/Dataset-Research-License-Feb-25-2025.pdf) restricts use and redistribution, including commercial use of resulting models. The Apache annotation license must not be used to bypass those conditions.
- **EgoExo-Fitness:** Its [official repository](https://github.com/iSEE-Laboratory/EgoExo-Fitness#-download) requests a signed dataset agreement and author contact despite also advertising a Hugging Face location. We did not apply, sign, or infer unrestricted media access from the repository's code license.
- **Kinetics/UCF101:** FitAQA references original assets rather than granting new media rights. Availability, matching bytes/frame sequences, and reuse terms must be checked per selected source. Existing action-recognition media cannot be given new form labels by guesswork; join only exact independently annotated assets. Do not move overlapping videos or people from the locked benchmark into training/development.

### Pull-up repository: metrics are not released ground truth

The [repository README](https://github.com/simeonkolchin/pullup-detection-ai) describes 150 source videos and detection/counting metrics. We inspected the [complete recursive tree](https://api.github.com/repos/simeonkolchin/pullup-detection-ai/git/trees/19ccbb3e8de5b1ac31a77e0202828d3603635ee4?recursive=1), which reported `truncated=false`, and the [release assets](https://github.com/simeonkolchin/pullup-detection-ai/releases/tag/weights-v1). Neither exposed that dataset, independent per-repetition fault labels, or a source-video manifest. The release contains bar, grip, person-detector, and pose weights only. Weights and predicted demo overlays cannot substitute for human ground truth.

At commit `19ccbb3e8de5b1ac31a77e0202828d3603635ee4`, the push-up `candidate.py` and `counter.py` files are zero bytes, contrary to an impression of a complete push-up implementation from the README. The [MIT license](https://github.com/simeonkolchin/pullup-detection-ai/blob/19ccbb3e8de5b1ac31a77e0202828d3603635ee4/LICENSE) covers the published software; it does not establish rights or availability for unreleased third-party training videos. Its reported results are not results for our app.

### ExeCheck: relevant squat mistakes, unresolved release license

The [official project page](https://www.cs.bu.edu/faculty/betke/ExeChecker/) describes seven healthy subjects, paired correct/incorrect RGB-D recordings, skeletal joints, and `RepSeg.csv`. The [paper, Table 1](https://arxiv.org/pdf/2412.10573) identifies squat mistakes involving knees and trunk, plus joints of attention. These are prescribed error patterns and exercise-level attention targets; do not assume they supply independently timed, per-repetition named-fault annotations. The paper's ten exercises exclude push-ups and pull-ups.

The [linked Dropbox folder](https://www.dropbox.com/scl/fo/afw5kn4tq12sd7t22nib9/AGmMX0ogpzWtmUxqy2JXGvE?dl=0&rlkey=utbatchbzwfafj5zg82xkp2cz&st=r8jbtdqz) returned a JavaScript page, not a verifiable file inventory in this check. A browser connection was unavailable, and no archives were fetched. No explicit dataset reuse license was found on the inspected project page or paper. This does **not** establish that no license exists inside the folder; it means download completeness and reuse permission remain unverified. A paper's publication license is not automatically a dataset license.

**Next decision:** prioritize a small, separately authorized FitAQA source-matched annotation pilot for push-ups/squats if media rights and exact asset identity can be established. Keep ExeCheck pending access/license verification. None of these three sources currently closes the independent pull-up form-validation gap, and none changes the current app's undefined form-accuracy result.
