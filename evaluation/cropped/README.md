# Real cropped-video regression

This bounded development check runs the **actual browser MediaPipe model on encoded pixel crops**. It does not remove landmarks from a previous full-body result. It checks how capture changes affect available evidence and whether negative/gapped inputs produce unsupported movement feedback. It does not establish good/bad form accuracy.

## Inputs and selection

Eight cases derive from three real source recordings plus one generated no-person negative:

| Source | Original control | Pixel perturbation |
| --- | --- | --- |
| [US Navy push-up demonstration](https://commons.wikimedia.org/wiki/File:Navy-seal-buds-training-push-ups.ogv), local source interval 81–88s | Seven-second H.264 fixture | Upper-body crop at x=330, y=20, width=390, height=440; a second version adds a 2.2–4.6s opaque blackout |
| Kinetics-600 training clip `_2ynLsdbiOs`, source interval 17–27s | Full original dataset clip | Central athlete's upper-body crop at x=400, y=50, width=420, height=270 |
| Kinetics-600 training clip `gV3dgCS0hWU`, source interval 9–19s | Full original dataset clip | Lower-body crop at x=0, y=80, width=320, height=100, padded with black to 320×180 |
| Original synthetic flat-color video | Five-second no-person negative | No exercise or movement synthesized |

Padding the squat crop meets the app's minimum input dimensions without inventing detail through upscaling. The crops are **synthetic capture perturbations of real originals**, not additional independent participants or naturally acquired partial-body recordings. There is no repetition duplication, generated human motion, or form labeling.

Only previously designated training/development material is used. The initial pull-up pilot was mostly setup/reaching in inspected frames, so a training clip with clearly visible pull-up movement was chosen. The squat source is an already-inspected training diagnostic with a side view. Selection was informed by visible recording content and known development context, so this is deliberately **not blind or held-out evaluation**. Original controls and unsuccessful crops remain in the report.

The Navy source is documented as a US Navy official-duty public-domain work in the local fixture provenance. Kinetics metadata is CC-BY-4.0; individual source-video redistribution rights have not been established. See [the acquisition provenance](../acquire/README.md). All source media, crops, extracted frames and per-frame reports stay in ignored local artifacts. Only source provenance, tool code and aggregate public outcomes are tracked. No private recordings are redistributed.

## Run

From the project root, prepare the local fixture manifest:

```powershell
node evaluation/cropped/prepare.mjs
```

Use the existing local preview on port 5174. From `frontend`:

```powershell
$env:ASTER_CROPPED_EVAL='1'
npx playwright test tests/cropped-model.spec.ts --workers=1 --trace=off --output=artifacts/test-cropped-partial-v1
```

Use a unique output directory for another concurrent test run. This suite reuses the preview and does not modify the analysis engine or restart an existing server. It is opt-in because real pose inference is slower than ordinary tests. FFmpeg runs with one decoding/encoding thread. One browser worker processes one clip at a time. Every model run starts from media pixels; no landmark cache is substituted. Network routes block origins other than the local preview. No speech/provider API is invoked.

The suite writes complete local reports and concise summaries below `frontend/artifacts/cropped-evaluation/results`. It records hashes of the model, worker and analysis source before each clip and rejects a source change during inference. The tests verify real evidence timestamps and support counts, no mutation of report status/repetition estimates by movement review, no evidence spanning the blackout, and no positive observation or strength on the empty negative.

Export public aggregates from the project root:

```powershell
node evaluation/cropped/summarize.mjs
```

The exporter reads only the public manifest and public summaries. It never reads private reports, images or landmarks. The resulting `public-results.json` does not contain form-quality labels.

For a later engine revision, set `ASTER_CROPPED_RUN` to a new simple name such as `recovery-v2`. Reports then go into a separate named subfolder, preserving the first run. Pass the same name to `node evaluation/cropped/summarize.mjs recovery-v2` to export a separate public aggregate. The blackout tests interrupted visibility, not a change between two real people.

## Optional private reproduction

A developer can place a local-only `private-inputs.json` beside the ignored crop manifest, containing `{id, exercise, path, privacy:"private"}` entries for explicitly authorized recordings, and enable `ASTER_PRIVATE_CROPPED=1`. The test sends these bytes only to its mocked local media route for browser inference. Outputs go to ignored `frontend/artifacts/private-evaluation/partial-movement-rerun`; private paths, landmarks and results must not be copied into tracked artifacts. Run with `--trace=off` and a separate ignored output directory.

## What these checks can establish

### Latest rule replay and recovery experiment, 10 October 2026

All eight saved public reports were replayed against the current three-point and two-point movement rules, including repeatable projected paths and continuous support observations. No new arm/leg/forearm/shin cue fired on these public cases. The movement IDs remain as in the table below. Existing measured strengths now appear as the primary coaching moment when no correction is available. `public-results.json` preserves the original inference fingerprints and adds `latestRuleReplay` with the current rule hashes, exact evidence timestamps and coaching focus. Reproduce the export with `node evaluation/cropped/summarize.mjs --replay` after running `cropped-replay.spec.ts`.

Fresh IMAGE-mode and padded IMAGE-mode inference was also compared on the three public cropped exercises, interrupted crop and empty scene. All five valid checks passed, but none produced an additional measured movement cue. Padding increased cropped squat chain coverage from 11 to 16 of 40 frames while changing its report from usable to partial; that does not establish better coaching. Pull-up coverage and continuity moved in different directions, and one multi-person detection caused both recovery candidates to be discarded for that frame. The empty and blackout conditions continued to abstain. These mixed results do not justify integrating recovery into the application. See [the experimental protocol](recovery-experiment.md) and `public-recovery-results.json`. Run `node evaluation/cropped/summarize-recovery.mjs` to export public comparisons only.

A separate Heavy-model VIDEO comparison keeps the worker and all confidence thresholds unchanged. Its public results are in `public-heavy-results.json`: Navy original retains the same two IDs; the interrupted crop gains `pushup-together` only in the visible section after the blackout (4.638–6.947 seconds); the empty scene remains insufficient with no pose or cue. No evidence window bridges the blackout. These three correlated public controls are a regression check, not independent accuracy validation. The larger model remains outside the shipped app. Reproduce the public export with `node evaluation/cropped/summarize-heavy.mjs`.

An independent MoveNet Thunder candidate also remains experimental. `public-movenet-results.json` contains only the Navy and empty controls: the existing two Navy cues remain, with 24/28 best-side arm-chain samples; the empty input has no cue. The same 0.65 downstream gate was used conservatively, although MoveNet confidence is not calibrated as MediaPipe visibility. Its documented 0.3 default is not a validated coaching threshold. These two controls cannot establish general cropped-video ability or inability. Reproducible isolated installation, pinned model preparation, mapping rules and limitations are in [the MoveNet protocol](recovery-experiment.md#independent-movenet-thunder-candidate). `prepare-movenet.mjs --verify-only` validates cached model assets without downloading; `summarize-movenet.mjs` exports only explicitly allowlisted public summaries and model/runtime hashes. Application dependencies and production model remain unchanged.

### First actual-model run, 10 October 2026

| Case | Report status | Visible relevant chain, best side | Movement output |
| --- | --- | ---: | --- |
| Navy original | usable | 28 / 28 samples | `pushup-hip-position`, `pushup-together` |
| Navy upper-body crop | usable | 28 / 28 | `pushup-together` |
| Pull-up original | partial | 25 / 40 | None |
| Pull-up upper-body crop | partial | 17 / 40 | None |
| Squat original | usable | 40 / 40 | `squat-together` |
| Squat lower-body crop | usable | 11 / 40 | None |
| Interrupted Navy crop | partial | 19 / 28 | None |
| Empty synthetic scene | insufficient | 0 / 20 | None |

No new local arm/leg tempo or rhythm IDs fired in this small first run. The crop controls therefore **do not yet demonstrate that the new local-chain feedback works on actual cropped footage**, even though temporal-rule unit tests may pass. The blackout and empty negative abstained as intended. The crop's retained Navy body-coordination strength deserves caution: the model reported confident in-frame hip landmarks on 26/28 and 27/28 samples even though the crop removes most hip/lower-body context. Landmark confidence alone cannot resolve whether those points correspond to visible anatomy. Source/model hashes and aggregate outputs are in `public-results.json`.

The first test run included an incorrect test assumption that every evidence window contains at least eight samples. Existing sustained-body-position evidence can validly be a seven-sample subwindow of a longer eligible segment. The test now checks at least three samples and exact agreement between the reported support count and observed timestamps; the original control was rerun successfully after that test-only correction. No model threshold or output was altered to make this benchmark pass.

This small regression can show whether the local model finds a usable visible arm/leg chain, what exploratory movement cues are emitted, and whether obvious negative conditions abstain. A confidence score is not proof that a joint is actually visible in the pixels: pose models may infer plausible hidden landmarks. Cropping can also remove the visual context the pose detector needs, even while a human can recognize the exercise. Both effects are limitations to report, not reasons to remove difficult cases.

There are no independent expert technique labels in this set. Neither passing these tests nor observing more feedback establishes clinical correctness, safe technique, an 80% form-accuracy result, or generalization to different people and cameras.
