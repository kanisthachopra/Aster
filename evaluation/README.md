# ASTER exercise evaluation

This is a reproducible local evaluation of the actual browser pose model and the app's observational rules. The target is **600 distinct public videos, 200 each of pull-ups, push-ups and squats**. A target is not a completed run: use the recorded manifest and inference totals to establish what actually ran.

The completed 2026-10-08 run processed all 600 distinct videos successfully. See [the results and deployment decision](results/summary.md). The bounded core refinement ships; the learned exercise classifier remains research-only after failing the predeclared selection/audit criteria. These are activity and observation-availability results, not correct-form accuracy.

## What can be measured

- Activity labels support three-way exercise recognition with abstention, true-station completion coverage, and wrong-station completion rates.
- Human repetition-count annotations, when available, support count MAE/RMSE and within-one accuracy. Activity labels alone do not.
- Good/bad form requires a defined expert annotation rubric and reliable human labels. Neither a Kinetics action label nor MediaPipe's keypoint visibility is a correctness label. This dataset does not provide landmark-position ground truth either. This pipeline does **not** establish form-quality accuracy or clinical safety.
- Threshold calibration is finite supervised rule selection. It is not reinforcement learning or neural-model retraining.

## Protocol

1. Acquisition writes JSONL records matching `schema.json`; raw media stay in ignored `frontend/artifacts/evaluation/media/` (or `evaluation/data/`). Do not add private user clips. Every record has provenance, licensing information, byte SHA-256 and a source group (original video/person/source identity where available).
2. `node evaluation/validate.mjs --manifest <path> --files --target` checks uniqueness, supported media policy and 200/class. Exact duplicate bytes are rejected. Different excerpts from a common source share a group.
3. `node evaluation/validate.mjs --manifest <path> --split` assigns reproducible approximate 60/20/20 train/validation/test groups and writes a lock file. Source groups never cross splits. Any pilot used for development must have `developmentOnly: true`, which forces its entire group into training.
4. Run the local app server, then `node evaluation/run.mjs --manifest <path> --target --workers 1 --split all --name inference-v1`. It uses the real `analyzeVideo` function and locally hosted Full model, on a minimal browser page without rendering the 3D world. Clips are decoded and inferred once; no synthetic poses substitute for inference. Three-class rule comparisons reuse those raw observations, not additional videos. All non-local network requests are blocked.
5. The runner caches compressed timestamped landmarks in ignored `evaluation/cache/<engine-key>/`. SHA-256, model, worker and extraction-source fingerprints determine the cache. Re-running resumes completed records. Model/decoder failures are counted explicitly, not silently excluded. Versioned JSON run summaries are tracked; raw video/landmarks are not.
6. `node evaluation/score.mjs --manifest <path> --engine <key> --version baseline --name baseline-v1` evaluates **only training/validation** and freezes calibration. A small fixed parameter grid is selected on training; thresholds/margins are selected on validation. The gate targets a 95% Wilson lower bound of at least 0.80 accepted-prediction precision, with minimum sample support. Failure to meet it is reported as failure, not hidden by a point estimate.
7. `node evaluation/train.mjs --input evaluation/results/baseline-v1-predictions-development.json --name linear-v1` fits the supervised activity candidate. Source-grouped training cross-validation selects regularization. Separate validation gates for each predicted class require a Wilson lower precision bound of 0.80 and adequate support; a class failing its gate always abstains. Global accuracy cannot conceal an unsupported class.
8. A proposed revision gets its own immutable source snapshot and development result. After the revision and protocol are frozen, append `--test` to the score command to evaluate the untouched held-out set. Do not tune again on that test result. Source/manifest fingerprints must match the frozen calibration. Report coverage, abstentions, per-class confusion and confidence intervals alongside precision.
9. `node evaluation/finalize.mjs --name v1` prepares development artifacts and stops for development review. Add `--audit` only after candidate development is finished; this performs the frozen held-out audit and writes `evaluation/results/summary.md`, but refuses to proceed unless the final inference run contains 600 unique successful records. Candidate selection is saved before held-out scoring; a failing held-out audit does not trigger retuning.

Media containing an unsupported duration/resolution is rejected before selection rather than covertly transformed into multiple supposed independent videos. Public source datasets may contain subjective labels, correlated creators, imperfect video availability and distribution shift; these limits remain even with source-group splitting. Runtime rule scores are **not** calibrated per-user probabilities.

Countix repetition annotations, when present, are evaluated only within the exact annotated time interval wholly contained in the decoded clip. A shorter decoded source or an incomplete interval is excluded from count scoring, never extrapolated into a whole-clip count. Annotation counts are independent of the app's detected cycles. The recognition benchmark contains three exercise classes; it does not establish rejection accuracy for every other activity or for deliberate misuse.

The inference runner defaults to one worker but a memory-constrained laptop should use `--workers 1`. On this host, one worker was faster overall than multiple competing browsers. Interrupted pilot/helper summaries remain audit records; only a finished final 600-record run establishes completion.

## Checks

`node --test evaluation/tests/*.test.mjs` validates source grouping, pilot exclusion, path/privacy restrictions, duplicate detection, metric separation, abstention and confidence intervals. The app's independent `frontend/tests/analysis.spec.ts` tests actual local inference, negative footage, cancellation, projected-angle math and partial observations.

A bounded nonlinear fallback is predeclared in `protocol-v1.json`: `node evaluation/train.mjs --input evaluation/results/baseline-v1-predictions-development.json --name forest-v1 --family forest`. It uses the same46 pose features, grouped training cross-validation, and per-class validation gates. If chosen on development data, pass `--candidate forest-v1 --audit` to the finalizer. Synthetic classifier tests verify implementation only; they are not real-video accuracy evidence.
