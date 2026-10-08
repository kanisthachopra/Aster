# Core review 0.5 — verification record

Revision date: 8 October 2026. World dynamics and typography are deliberately outside this revision at the learner's request. No deployment or private-video upload.

## Live evidence and spoken review

- Processing displays the exact decoded frame and its actual measured visible joints. A single optional bitmap copy is released after synchronous drawing; batch inference does not make this copy. No skeleton interpolation invents movement through missing tracking.
- The clip remains bounded at its original aspect ratio. Video playback controls pause during analysis; users can hide tracking or cancel. Progress and timestamps remain visible.
- Spoken review text is derived from report observations, timestamps, suggestions and uncertainty. Automatic reading when connected, whole-review replay, individual-finding playback, Stop and transcript are available. Closing or replacing the review aborts its speech without cancelling a newly started mission line.
- The local Deepgram endpoint keeps the key server-side, validates same-origin loopback requests, bounds input/output and generation budget, caches exact readings in memory, and aborts disconnected requests. No recording or pose data is sent. Missing configuration, muted audio and provider failures remain explicit.

## Checks completed

- Final integrated selection: **32/32 passed** across analysis, live review, portrait layout, speech transport/playback, and reward bookkeeping. This includes actual MediaPipe inference on the public exercise and negative fixtures. The separate opt-in real Deepgram browser check passed, and all 19 evaluation/core protocol checks passed.
- Five focused browser checks passed: report-text/uncertainty construction; actual model inference with advancing visible skeletons and report-specific voice transport; cancellation without stale report/speech; actual no-person inference without a fabricated skeleton; portrait recording proportions and visible Analyze action.
- The speech implementation's full server/audio/browser selection passed 11 checks. Its final four browser lifecycle checks also passed after adding cancellation during AudioContext startup. Mocked provider audio verifies transport and lifecycle, not real Deepgram voice quality.
- Production TypeScript/build passed. The existing large 3D JavaScript chunk advisory remains; no new world assets or motion library were added.
- The local configuration now reports a connected Deepgram voice. One real 295-character reading returned HTTP 200, 106,704 bytes of MP3 audio, and passed full decoding. The key was never read or printed. The sample is available for the learner to audition; subjective voice quality is not established by an API/decode check.
- The opt-in real-provider browser check passed: genuine Deepgram audio reached playback and completed, an exact replay used the local cache, and Stop cancelled that replay. After receiving the sample, the learner chose to keep this voice for now.
- Screenshots of actual public-domain exercise inference were inspected: visible skeleton registration, processing state and completed review. Screenshots remain ignored artifacts.

## Motion and component review

The animate skill is applied as state indication: measured motion is data, so it is not eased or fabricated. The only decorative voice indicator is a restrained opacity pulse, disabled by system/app reduced-motion preferences. There is no layout animation, new motion dependency, forced playback delay or moving text. Tracking has an explicit hide control. React review focused on stable speech props, per-reading cancellation, effect cleanup, no stale async updates and bounded bitmap lifetime.

## Evaluation status

All 600 distinct public clips completed actual inference on 8 October 2026: 200 pull-ups, 200 push-ups and 200 squats, with zero unresolved failures. The final resumed run processed 238 newly inferred clips and reused 362 matching completed model caches. Earlier interrupted attempts are preserved and do not add to the unique-video total. The locked split contains 360 training, 120 validation and 120 held-out clips. The exact corpus, provenance and measured outcomes are recorded separately under evaluation/.

Form-quality validity remains distinct from activity recognition. The current pose pipeline reports camera-view observations and uncertainty. Action labels alone cannot establish whether a correction is right, whether technique is safe, or whether a particular user-facing confidence number is calibrated.

The selected core refinement passed its frozen held-out criteria: usable reviews stayed at 58/120, partial reviews rose from 54 to 58, insufficient reviews fell from 8 to 4, and wrong-station completions stayed at 0/240 trials. Per-exercise tradeoffs remain visible in the [full report](../evaluation/results/summary.md): squat usable reviews rose 14→15/40, while pull-ups fell 20→19/40.

The forest activity candidate is withheld. Its held-out accepted precision was 95/101 (94.1%) at 84.2% coverage; the squat precision interval's lower bound was 75.8%, below the required 80%. It also failed the development selection criterion for overall accuracy. No test-driven retuning followed. Countix's 10 held-out annotated intervals yielded a count MAE of 1.80, within-one accuracy of 70%, and exact accuracy of 10%; repetition estimates remain explicitly exploratory. Independently validated form-correction accuracy remains open.
