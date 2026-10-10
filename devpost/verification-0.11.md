# Aster 0.11: visible feedback and partial-review guidance

Checked 10 October 2026. Knowledge snapshot 1.2.0 / analysis `partial-review-0.11`. This refinement adds one narrow pull-up strength and fixes the partial-review experience. It does not close the broader cropped-correction accuracy gap.

## Changed behavior

The pull-up return check requires an observed rise followed by shoulders/hips coming down together while the visible hand stays in a similar position. It supplies a practical keep-doing cue and bounded replay. Hidden elbows do not invalidate this separate visible chain. No full-rep, grip-pressure, shoulder-safety or overall-control judgment is made.

Partial tracking no longer replaces all practice guidance with a reshoot request when body evidence exists. The person sees a clearly labelled practice cue for their chosen version, with recording help behind a separate control. No timestamped fault is fabricated. They can change the version/goal after analysis; speech and saved notes update, acknowledgement resets, and superseded conversational explanations are discarded. Injury advice takes precedence.

## Evidence and limits

- 76 distinct movement/coaching/server-selector/browser checks passed, including camera-motion, hidden-point, gap, station/identity, late-explanation, voice-recovery and health counterexamples. UI speech uses a harness, not a paid provider call.
- Production typecheck/build passed. The existing large 3-D bundle advisory remains.
- Final fresh-model checks use eight public cases and three permitted private clips. Private images, paths, landmarks and personal observations are ignored. Public aggregates are in `evaluation/cropped/public-results-return-v011-final.json`.
- Both difficult permitted recordings completed the actual local upload → decode/inference → review → harness speech → replay/save flow, with external/API requests blocked. This checks behavior and retained evidence, not coaching correctness or hosted database storage.
- An additional public DVIDS instructional video produced no finding. It is edited and unlabelled; do not use it as a positive fault-accuracy benchmark.
- YOLOX/RTMPose/ViTPose improved some detection/point placement but not reliable corrections; no new tracker/runtime ships.
- Six bounded Kimi image requests were evaluated. Only the specifically approved twelve private stills were shared, in two passes; no full private recordings or extra images. Generated advice remains experimental because unsupported temporal/contact implications persist.

Earlier failures were retained: a hardcoded old knowledge-version assertion, an initial UI change that cleared the injury reply, a token-capped provider response and sandbox-blocked requests. The assertion and UI behavior were corrected, then frozen tests passed. The unsuccessful model candidates were not hidden or released.

The severe push-up crop still lacks a reliable measured correction. The new pull-up output is a supported **strength**, not a demonstrated fault correction. There are no new expert form labels, calibrated coaching confidence, reinforcement-learning updates or automatic shared training. The older 600-video evaluation remains historical coverage evidence.

## Publication

Commit/push and hosted release checks are recorded after the final source, public-data and secret audit. The private test inputs and unrelated `devpost/scope.html` are excluded from the commit.
