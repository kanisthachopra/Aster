# Local motion model

`pose_landmarker_lite.task`: Google MediaPipe Pose Landmarker Lite, float16, version **1**.

- Download: https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task
- SHA-256: `59929e1d1ee95287735ddd833b19cf4ac46d29bc7afddbbf6753c459690d574a`
- Model card / Apache-2.0 license: https://storage.googleapis.com/mediapipe-assets/Model%20Card%20BlazePose%20GHUM%203D.pdf (page 2).
- License text: `../mediapipe/LICENSE.txt`.
- Runtime: `@mediapipe/tasks-vision` **0.10.32**, pinned in package-lock.json. `../mediapipe/vision_bundle.js` is the unmodified package `vision_bundle.cjs`, renamed so a classic worker can load it. Both SIMD/non-SIMD WASM variants and their loaders are copied unchanged from that package. The worker provides the CommonJS `exports` object. No CDN, cloud inference, credentials or private-video upload is used.

The JavaScript runtime and model run in a dedicated worker. Cancelling terminates it. Each analysis samples four frames per second (maximum 240), requires a 2–60 second clip and rejects clips above 150 MB. Angles use image aspect correction; depth estimates are not used as physical measurements. Visibility ≥0.65 plus in-frame checks gates the head and one complete body side. Two-person detections are discarded. Station-specific orientation rules reject clearly incompatible positions. At least 60% usable frames, eight usable samples and one complete 28°-minimum projected excursion are needed to produce a review. A tracking gap or side change breaks a candidate cycle. These thresholds are exploratory capture/movement rules, not medically validated form limits or exercise classifiers.

Reports deliberately describe actual observations and uncertainty. No universal ideal angles, safety score or assertion that form is correct is generated. Single-view footage cannot establish pain, load suitability, injury, precise shoulder rotation or individual safe range. Form-coaching validation on representative exercise clips remains necessary.

## Optional reproducible model smoke test

Download Google's official public test image from https://storage.googleapis.com/mediapipe-assets/pose.jpg to `frontend/artifacts/analysis/pose.jpg`, then run `npm test -- analysis.spec.ts`. It is referenced in Google's [pose landmarker tests](https://github.com/google-ai-edge/mediapipe/blob/master/mediapipe/tasks/python/test/vision/pose_landmarker_test.py). The image stays in ignored test artifacts and is not redistributed or shipped. The test checks real model inference, not exercise accuracy. Deterministic synthetic-joint tests separately check angle math, full cycles, gaps, incompatible orientation and stillness. The original generated colour-pattern video is a real-inference negative test.

## Real exercise smoke test (2026-10-08)

The optional `artifacts/real-exercise.mp4` fixture is a seven-second segment (source 81–88 seconds) of [Navy-seal-buds-training-push-ups.ogv](https://commons.wikimedia.org/wiki/File:Navy-seal-buds-training-push-ups.ogv), credited to the United States Navy SEALs. Commons identifies it as public-domain U.S. government work and applies the [Public Domain Mark](https://creativecommons.org/publicdomain/mark/1.0/). [Original media](https://upload.wikimedia.org/wikipedia/commons/e/e6/Navy-seal-buds-training-push-ups.ogv). Converted to H.264 and muted, with no synthesized movement. It stays in ignored artifacts and is not shipped. No endorsement is implied.

Actual browser inference on this clip yielded 26 usable frames of 28 sampled, 2 estimated cycles and timestamp-linked angle observations. This checks a real positive path on one push-up clip; it is not a representative accuracy evaluation. Squat and pull-up positive paths still require representative real-exercise validation. The tests also submit this push-up clip to those two incompatible stations and require an insufficient result. Cancellation and same-origin-only network behavior are tested separately.
