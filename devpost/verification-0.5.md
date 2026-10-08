# Core review 0.5 — verification record

Revision date: 8 October 2026. World dynamics and typography are deliberately outside this revision at the learner's request. No deployment or private-video upload.

## Live evidence and spoken review

- Processing displays the exact decoded frame and its actual measured visible joints. A single optional bitmap copy is released after synchronous drawing; batch inference does not make this copy. No skeleton interpolation invents movement through missing tracking.
- The clip remains bounded at its original aspect ratio. Video playback controls pause during analysis; users can hide tracking or cancel. Progress and timestamps remain visible.
- Spoken review text is derived from report observations, timestamps, suggestions and uncertainty. Automatic reading when connected, whole-review replay, individual-finding playback, Stop and transcript are available. Closing or replacing the review aborts its speech without cancelling a newly started mission line.
- The local Deepgram endpoint keeps the key server-side, validates same-origin loopback requests, bounds input/output and generation budget, caches exact readings in memory, and aborts disconnected requests. No recording or pose data is sent. Missing configuration, muted audio and provider failures remain explicit.

## Checks completed

- Five focused browser checks passed: report-text/uncertainty construction; actual model inference with advancing visible skeletons and report-specific voice transport; cancellation without stale report/speech; actual no-person inference without a fabricated skeleton; portrait recording proportions and visible Analyze action.
- The speech implementation's full server/audio/browser selection passed 11 checks. Its final four browser lifecycle checks also passed after adding cancellation during AudioContext startup. Mocked provider audio verifies transport and lifecycle, not real Deepgram voice quality.
- Production TypeScript/build passed. The existing large 3D JavaScript chunk advisory remains; no new world assets or motion library were added.
- The actual local configuration endpoint reports no configured Deepgram key. No real provider request or audition is claimed. The key slot and setup instructions are ready.
- Screenshots of actual public-domain exercise inference were inspected: visible skeleton registration, processing state and completed review. Screenshots remain ignored artifacts.

## Motion and component review

The animate skill is applied as state indication: measured motion is data, so it is not eased or fabricated. The only decorative voice indicator is a restrained opacity pulse, disabled by system/app reduced-motion preferences. There is no layout animation, new motion dependency, forced playback delay or moving text. Tracking has an explicit hide control. React review focused on stable speech props, per-reading cancellation, effect cleanup, no stale async updates and bounded bitmap lifetime.

## Evaluation status

The exact 600-clip corpus and its measured outcomes are recorded separately under evaluation/. At the initial UI checkpoint, six public dataset pilots had completed real inference; the full corpus was still being decoded and selected. This checkpoint does not claim 600 successful runs or 80% form accuracy. Final counts and held-out results will supersede this paragraph after the full run finishes.

Form-quality validity remains distinct from activity recognition. The current pose pipeline reports camera-view observations and uncertainty. Action labels alone cannot establish whether a correction is right, whether technique is safe, or whether a particular user-facing confidence number is calibrated.
