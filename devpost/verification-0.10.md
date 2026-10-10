# Aster 0.10: partial-view review and visual context

Checked 10 October 2026. This revision separates feedback about a visible limb from whole-body coverage, makes supported strengths primary feedback, prevents held positions from distorting tempo advice, and adds optional previewed image context.

## Local verification

- Production typecheck/build passed. The existing large 3-D bundle advisory remains.
- 57 browser/temporal/coaching checks passed, including actual MediaPipe inference from a public Navy clip, empty footage, cancellation, practical voice, injury changes, cropped chains, independent 3-D foreshortening fixtures and long-hold timing regressions.
- 18 account/server checks passed, including three image-route checks for verified identity, origin, consent, injury bypass, reconstructed payload, persistent budgets and size limits.
- 9 isolated vision-service checks passed for fixed configuration/transport, strict input/output, image structure, bounds, deadlines and cancellation.
- Snapshot UI tests verify a local preview before any inference request, explicit sharing choice, ignoring late replies after Stop, and hiding/aborting sharing after pain disclosure. A duplicate sibling-key bug discovered in testing was corrected before release.

Early runs included sandbox-denied local network access and a source-update race. The final frozen runs above used the existing preview and passed. A transient no-person test failure under concurrent model evaluation did not recur in the final isolated sequence. Failed artifacts were retained locally.

## Actual recording evidence

Eight public cases completed fresh Full-model inference. Three existing private clips were processed entirely locally. The current rules were replayed over all saved reports after source freeze, without changing timestamps, inference or completion status. The [public aggregate](../evaluation/cropped/public-results.json) includes source hashes and exact evidence spans; private pixels, paths, landmarks and per-clip reports remain ignored.

The private squat retains a specific coordination strength. The severely cropped private push-up has too few continuous arm detections; the private pull-up does not satisfy a specific correction's movement/evidence requirements. New local limb IDs did not fire in this small actual-video set. This remains unfinished functionality, despite passing synthetic-rule tests.

IMAGE detection and padding were compared on cropped public clips and the difficult private push-up. Heavy VIDEO inference was compared on public original/empty/interrupted clips and both difficult private recordings. Neither solved the private failures. They remain evaluation-only. The larger model changed some public coverage but worsened the private examples. One Heavy test caught a concurrent rule-file update; inference/model/worker hashes were unchanged, and a subsequent frozen-rule replay verified the saved reports. See [experiment details](../evaluation/cropped/recovery-experiment.md).

## Provider evidence

Six bounded diagnostic requests used only public Navy images. MiniCPM failed; Gemma accepted image input. The final exact service call returned strictly valid exercise/view/visible-region context in 2.528 seconds. Some earlier phase/visibility judgments differed, so phases and faults are explicitly excluded from the shipped provider contract. Connectivity and schema acceptance are not proof of visual accuracy.

The new setting uses the existing server-only Nebius key and a separate model name. The UI previews six locally re-encoded snapshots before consent. Aster does not store the snapshot copies or a shared provider conversation. Authenticated per-user/global budgets and explicit health bypass apply. `store:false` does not guarantee all provider retention behavior. No private clips were sent during development.

## Research and remaining validation

[Movement understanding](../research/movement-understanding.md) and [source ledger](../research/movement-sources.md), version 1.1.0, record primary references, required views, variations, counterexamples and update procedures. Saved coaching notes retain `partial-review-0.10` and knowledge version `1.1.0`. Markdown edits are not automatic training.

The previous 600-video 0.9 result is historical cue coverage, not current form accuracy. There are no independent fault labels supporting 80% correctness or reinforcement-learning claims. A qualified, independently labeled evaluation is still required; private uploads do not become a training corpus by default.

## Hosted verification

Commit `d09d075` was pushed and served by the public `aster.kcmira.me` build. Twenty hosted checks passed at 05:54 UTC on 10 October 2026: real sign-in and station navigation, local tracking of the public Navy clip, actual non-silent Deepgram review audio, six locally previewed originals, disabled sharing before consent, an actual structured Nebius image response, a trusted text explanation, and saving useful private notes with both version fields and no raw landmarks. No browser runtime errors occurred. The disposable account was removed successfully.

This adds one hosted image request and one hosted text explanation to the earlier six vision diagnostics. The hosted call verifies the application boundary, not coaching accuracy or private-crop recovery. The [source ledger](../research/movement-sources.md) preserves that distinction. Ignored proof is `frontend/artifacts/coaching-production-verification.json`; screenshots include `partial-context-production.png`. Private videos were not used in this hosted test.
