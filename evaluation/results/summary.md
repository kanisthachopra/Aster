# ASTER 600-video evaluation

Completed 2026-10-08T09:43:59.912Z. All 600 distinct public source videos were processed by the actual app pipeline:200 pull-ups, 200 push-ups, 200 squats. 238 were newly processed in the final run and 362 reused matching completed inference caches. 0 failed. Cached pilot/helper results are actual model runs, not synthetic samples.

Source groups were locked before outcome scoring:360 training, 120 validation, 120 held-out test. No original YouTube ID or exact video bytes cross splits. Different YouTube IDs may still share creators or people; this is not a person-disjoint guarantee.

## What changed in the app

The bounded core revision was shipped. It keeps a consistent visible body side, admits overhead-arm squats when grounded motion is observable, treats abrupt tracking changes cautiously, and preserves limited observations when exercise identity is unclear. Partial observations never earn workout credit. On the held-out set, usable reviews stayed at 58/120, partial reviews increased from 54 to 58, and insufficient reports fell from 8 to 4. Wrong-station completion stayed at 0/240 trials. Zero observed errors is not a guarantee of zero future errors.

The learned activity classifier was **not shipped**. Its higher accepted precision came with more abstentions, it failed the development selection rule, and its squat class failed the final precision-interval gate. Users still select the exercise station. Neither the baseline comparator nor the research classifier is a live correct-form score. The frozen decision and source equivalence are recorded in `core-selection-v1.json` and `core-decision-v1.json`.

## Activity recognition

| Method | Split | Correct / total (abstentions count as misses) | Coverage | Accepted precision |95% Wilson interval|
|---|---|---:|---:|---:|---|
|Baseline rules|train|301/360 (83.6%)|96.1%|87.0%|83.0%–90.1%|
|Baseline rules|validation|101/120 (84.2%)|95.0%|88.6%|81.5%–93.2%|
|Baseline rules|test|99/120 (82.5%)|96.7%|85.3%|77.8%–90.6%|
|Supervised candidate|train|277/360 (76.9%)|79.4%|96.9%|94.1%–98.3%|
|Supervised candidate|validation|94/120 (78.3%)|81.7%|95.9%|90.0%–98.4%|
|Supervised candidate|test|95/120 (79.2%)|84.2%|94.1%|87.6%–97.2%|

### Held-out results by class

Precision is calculated among predictions of that class. Coverage is the fraction of true examples receiving any non-abstaining prediction; recall measures correct predictions among all true examples.

|Method|Class|Predicted support|Precision (95% interval)|Coverage|Recall|
|---|---|---:|---|---:|---:|
|Baseline|pullup|44|79.5% (65.5%–88.8%)|97.5%|87.5%|
|Baseline|pushup|38|94.7% (82.7%–98.5%)|97.5%|90.0%|
|Baseline|squat|34|82.4% (66.5%–91.7%)|95.0%|70.0%|
|Candidate|pullup|32|96.9% (84.3%–99.4%)|85.0%|77.5%|
|Candidate|pushup|37|94.6% (82.3%–98.5%)|90.0%|87.5%|
|Candidate|squat|32|90.6% (75.8%–96.8%)|77.5%|72.5%|

The candidate's per-class validation gates passed. The development-only selection chose **the baseline**. The final candidate gate does not pass the predeclared deployment audit. Held-out outcomes were not used to refit weights or thresholds. Per-class test gate: pullup: pass; pushup: pass; squat: fail.

The baseline three-way activity rule is an evaluation comparator derived from existing app orientation/motion measurements. The app previously asked the user to select a station. Its separate completion behavior is shown below; activity-classifier precision must not be substituted for this measure.

|Core rules|Split|Correct station: usable|Partial|Insufficient|Wrong-station usable / trials|
|---|---|---:|---:|---:|---:|
|baseline|train|168/360|173|19|9/720|
|baseline|validation|63/120|48|9|4/240|
|baseline|test|58/120|54|8|0/240|
|revised3|train|169/360|178|13|5/720|
|revised3|validation|64/120|50|6|1/240|
|revised3|test|58/120|58|4|0/240|

Held-out completion behavior by true exercise (a usable observation is not a correct-form label):

|Core rules|Exercise|Usable / videos|Partial|Insufficient|Wrong-station usable / trials|
|---|---|---:|---:|---:|---:|
|baseline|pullup|20/40|19|1|0/80|
|baseline|pushup|24/40|14|2|0/80|
|baseline|squat|14/40|21|5|0/80|
|revised3|pullup|19/40|20|1|0/80|
|revised3|pushup|24/40|15|1|0/80|
|revised3|squat|15/40|23|2|0/80|

## Independently annotated repetition intervals

Countix annotations are scored only over wholly present source-annotated intervals. They are not treated as full-clip counts. The prediction is the same app cycle heuristic applied to that exact window.

|Split|Intervals|Videos|MAE|RMSE|Within one|Exact count|
|---|---:|---:|---:|---:|---:|---:|
|train|31|30|2.03|2.74|38.7%|16.1%|
|validation|9|9|1.78|2.05|33.3%|11.1%|
|test|10|10|1.80|2.61|70.0%|10.0%|

## Limits and provenance

- **Form-quality accuracy is unvalidated.** Kinetics labels identify actions; they do not label correct versus incorrect technique or provide joint-position ground truth. No 80% form-correctness, medical-safety, or clinical-validation claim is supported.
- The candidate uses supervised activity classification on app-derived motion features. This is not reinforcement learning and does not retrain MediaPipe. Softmax outputs are not individual correctness probabilities.
- This is a closed three-action benchmark. Rejection of unrelated activities, deliberate misuse, and unseen camera distributions is not established.
- Cycle windows can lose repetitions at boundaries or when tracking fails. Activity recognition does not establish counting accuracy. Source labels and camera conditions may be noisy; source distribution can differ from users' recordings.
- Raw media and landmarks remain ignored local files. Private user clips were excluded. Video redistribution rights were not assumed; source metadata and hashes are recorded in the manifest.
- Model/extraction cache key: `6ef59e1c82fd6042913c`. Manifest SHA-256: `c72e3e69e87fc1cc4f54296a8f39d30001c255a689f41e525267e1d6f019121e`. Baseline rules SHA-256: `067cbc0076f54779b357708de72a380c0fb0fda20074286fed26e0f4ba716490`. Model/worker/extraction hashes are in `inference-v1.json`; trained weights and gates are in `forest-v1-model.json`.
- Early blind/helper runs were intentionally interrupted during resource tuning. The first full-run attempt lost its browser at record352 after351 successful records; that clip succeeded after resuming. A resume also encountered a transient Windows checkpoint-file lock, addressed with bounded atomic-rename retries. These incomplete attempts are preserved separately and do not inflate the600 unique-video count. One profiling attempt failed under memory pressure; its isolated retry succeeded. Final totals above come from the complete 600-record run and validated matching caches.
