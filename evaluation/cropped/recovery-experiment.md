# Local IMAGE-mode recovery experiment

This development experiment compares the existing VIDEO-mode reports against fresh IMAGE-mode detection and IMAGE-mode detection with 20% neutral padding on each edge. It is not enabled in the app. It uses the same locally installed Full Pose Landmarker model, CPU delegate, detector confidence thresholds, and sample timestamps. No videos or observations are sent to external providers.

The new evaluation-only worker is `frontend/tests/harnesses/pose-recovery-worker.js`. It accepts `init` and transferred `frame` bitmaps. Its response contains `image`, `padded`, the detector pose `counts`, and `ambiguous`. If either view detects more than one person, both alternatives are discarded for that frame. This cannot prove identity in undetected multi-person scenes.

Padding changes detector context, not the region where evidence is accepted. Padded coordinates are mapped back to the original image; any landmark outside the original image margin has visibility set to zero. Existing review rules still require visibility at least 0.65. A model can nevertheless confidently misplace an in-bounds joint; more detected points alone are not proof of accuracy. No invisible joint is filled from the opposite limb, previous frames, or an assumed exercise pose.

The comparison records, separately by body side, visible three-joint chains, visible two-point segments, longest uninterrupted segment runs, and discontinuities exceeding 0.15 image heights between adjacent endpoints. It does not select a variant by whether it produces a desired coaching message. Candidate selection and production integration require separate review. Neither image alternative changes the production report's status, repetition count, or reward eligibility.

The tests decode the actual source video through a Blob URL and seek to the saved baseline timestamps. An early discarded harness iteration used a direct intercepted MP4 URL without byte-range seeking support, which repeated the first frame. The corrected tests require changing landmark results and verify that the blackout interval has no pose evidence. The discarded iteration is not evidence for recovery performance.

Run from `frontend`, using the existing local server:

```powershell
$env:ASTER_RECOVERY_EVAL='1'
npx playwright test tests/cropped-recovery.spec.ts --output=artifacts/test-cropped-recovery-v2
$env:ASTER_CROPPED_EVAL='1'
npx playwright test tests/cropped-replay.spec.ts --output=artifacts/test-cropped-replay-v2
```

Raw reports, private diagnostics, and recordings remain in ignored artifacts. The public cases and their provenance are documented in this directory's README. Synthetic crops and blackout variants are correlated development controls, not new independent source videos or form-quality labels. Results cannot establish population accuracy or the correctness of an exercise.

MediaPipe API reference: [official Web Pose Landmarker guide](https://developers.google.com/edge/mediapipe/solutions/vision/pose_landmarker/web_js). IMAGE uses `detect()`; VIDEO uses `detectForVideo()`. The worker keeps synchronous inference off the UI thread.

## Higher-capacity model candidate

The official [MediaPipe model guide](https://developers.google.com/edge/mediapipe/solutions/vision/pose_landmarker) also provides a Heavy variant. The experiment downloads [Heavy float16 version 1](https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_heavy/float16/1/pose_landmarker_heavy.task) into ignored artifacts, rather than shipping it in the app. The file is 30,664,242 bytes, SHA256 `64437af838a65d18e5ba7a0d39b465540069bc8aae8308de3e318aad31fcbc7b`.

`cropped-heavy.spec.ts` substitutes that model response inside its local test browser. The production VIDEO worker, confidence thresholds, sampling schedule, and review code remain unchanged. The bounded comparison uses the Navy original, interrupted crop and empty scene plus explicitly authorized private reproduction inputs. Only public aggregate outcomes may be exported. The Heavy run writes to separate ignored `heavy-v1` folders. Run from `frontend` with `ASTER_HEAVY_EVAL=1`, using a unique Playwright output directory and `--trace=off`.

The completed run had five passing test cases and one source-stability failure when movement-review helpers changed during the last inference. Model, worker, decoding and measurement hashes remained unchanged. All saved baseline, IMAGE, padding and Heavy reports were subsequently replayed with the final frozen movement/coaching code; that replay passed, including a before/after source-hash check. This distinction preserves the failed test rather than labeling it a clean six-case pass. The public cases were source-stable at their inference times and their exports include a separate final-rule replay.

Final decision: keep IMAGE/padding and Heavy outside production. The alternatives did not recover an additional local limb cue on this development set. Heavy also increased measured runtime on these public cases (Navy control 5.0→24.5 seconds, interrupted crop 6.9→19.4 seconds); runs were not controlled hardware benchmarks, so the ratios should not be generalized. Improving confidence coverage is insufficient justification to replace the model.

