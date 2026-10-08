# Independent annotation and evaluation rubric

Protocol: `rehab24-form-feasibility-v1`. This is an evaluation design, not a completed expert review. No ground-truth labels, reviewer credentials, or performance scores have been invented.

## 1. Freeze the claim and the evaluation unit

Before inference, record source checksum, app/model/configuration hashes, exercise variant, camera, preprocessing, sampling schedule, and timestamp mapping. Keep source person, recording, repetition, and camera IDs. Retain a manifest of every attempted clip, including decoder failures, timeouts, rejected uploads, and abstentions.

Use one logical repetition for any future binary correctness result. Multiple repetitions in one uploaded clip cannot be compared with a single chosen label. Keep both views and all crops in the same person group. A clip-level report that has no per-repetition correctness decision remains **not scoreable for correctness**.

For the current app, define each reported measurement or observation as a separate claim. Record its exact text and evidence frame. Do not convert a suggestion to inspect movement into a prediction that the movement is wrong. Report evidence coverage, measurement performance, and suggestion review separately.

## 2. Establish frame and joint alignment first

Verify the actual decoded frame rate, zero/one-based frame numbering, whether the final frame is inclusive, and the relationship between source frame numbers and cropped upload timestamps. The published CSV semantics do not resolve every indexing convention. Inspect known repetition boundaries and synchronized events in both cameras before scoring temporal errors.

The source uses “profile” in CSV orientations and “side” in its cross-camera mapping. Normalize this deliberately and verify against the media. Check actual camera labels and archive paths; do not infer filenames. Record any offset or resampling rule before running the model.

Create an explicit anatomical mapping from the dataset's 26-joint skeleton to the app's 33-landmark representation. Names alone do not establish equivalence. Where points are not equivalent, mark the measurement unavailable or obtain independent manual points; do not silently substitute joints.

For angle evaluation, compare the **same projected 2D angle**, on the same side and frame, with matching pixel aspect ratio. Do not compare an image-plane angle against a 3D anatomical angle and call the difference model error. The dataset's projected joints use estimated camera parameters and have their own uncertainty. Use manually reviewed visible joints as an additional check. Exclude `mocap_erroneous=1` from motion-capture-reference metrics and report the excluded count; that flag does not itself label the RGB image unusable or the exercise incorrect.

## 3. Collect independent annotations

Use two qualified physiotherapists or exercise professionals with documented relevant competence. Record their credentials and scope rather than describing unqualified reviewers as clinical experts. The reviewers independently assess the video before seeing model output, model-selected frames, or the dataset's binary correctness label. A third qualified reviewer adjudicates disagreement while preserving the original annotations.

For each repetition/view, record:

- Exercise and variant, phase boundaries, camera suitability, occlusion, subject identity continuity, and visible body parts.
- Independent manual joint points at the predeclared evaluation timestamps, with uncertainty and visibility. Sample timestamps independently of model-selected frames as well as reviewing the displayed evidence.
- Any observable named fault using a pre-agreed definition, onset/end, body side, relevant phase, direction of deviation, and confidence. Use `unobservable`, `uncertain`, or `not_applicable` when warranted.
- Whether load, intent, history, pain, or another missing context prevents a corrective judgment. Do not infer these from appearance or ethnicity.

An operational fault definition must specify exercise variant, required view, movement phase, anatomical relation, duration, and supporting expert rationale. Do not invent universal “bad form” angle cutoffs from this dataset or tune them to its correctness labels. A global incorrect label may encompass faults that this view or the app's measurements cannot observe.

After independent labeling is locked, unblind the official correctness labels and record disagreements; do not overwrite human labels to match the dataset. Then present app findings for a separate claim-support and correction review. Reviewers should not change the initial movement annotations to fit a plausible-sounding suggestion.

## 4. Review current outputs without pretending they are faults

| Output | Independent question | Record/metric |
| --- | --- | --- |
| Elbow/knee angle | Are the same visible joints, side, and frame used? | Absolute angular error, median/mean and distribution; report reference uncertainty and missing rate |
| Body-line angle | Does the shoulder–hip–ankle projection match the stated number? | Same angle metrics; does not establish spinal posture or a fault |
| Low/high angle range | Does the independently measured sampled trajectory support the reported range? | Endpoint error and trajectory coverage; distinguish robust percentile range from a true minimum/maximum |
| Evidence timestamp | Does the selected frame support the exact observation? | Frame/time error where a reference event exists; otherwise blinded supported/unsupported/uncertain judgment |
| Tracking and visibility | Is the intended person and relevant anatomy visible and reliably identified? | Visibility sensitivity/precision, tracking switches, appropriate-abstention rate, and coverage |
| Capture recommendation | Is its stated visibility/view limitation actually present? | Supported/unsupported/uncertain/not-applicable, with rationale |
| Exploratory cycles | Do detected events match annotated repetition intervals under a predeclared matching rule? | Count absolute error and event precision/recall; no form-quality inference |
| Generic inspection prompt | Is it relevant and correctly qualified given the visible evidence? | Supported/unsupported/uncertain/not-applicable; explicitly `no_fault_claim` where applicable |
| Explicit future correction | Does it address an independently annotated, observable fault without adding an unsupported diagnosis? | Appropriate/inappropriate/uncertain/not-applicable; direction and evidence agreement, potentially harmful advice flag |

Set any numerical tolerance, temporal matching window, point-normalization convention, and uncertainty policy before results. Tolerances should reflect measurement/reference error and the intended claim; they are not medical safety thresholds. Do not pick a tolerance after seeing the score.

A suggestion can be broadly sensible yet unsupported by the particular clip. Distinguish this from a supported individualized correction. “Compare your torso position” is a review prompt; it is neither a true-positive fault detection nor proof that changing position would be appropriate.

## 5. Evaluate a future fault predictor only after its contract exists

For a future binary predictor, require an explicit frozen `correct`, `incorrect`, or `abstain` result for each source repetition. Compare against the official labels with the same unit. Report the confusion matrix, sensitivity, specificity, precision, balanced accuracy, coverage, and abstention by true class. Do not hide abstentions by reporting only conditional accuracy; report both the full denominator and answered subset.

For named faults, require explicit fault IDs and intervals and compare with independent fault annotations. Report per-fault precision/recall, temporal localization, coverage, and reviewer agreement. Do not use a generic whole-repetition incorrect label as truth for every named fault. Correction appropriateness is a separate outcome and cannot be inferred from detecting an incorrect repetition.

Any required release target must be agreed in advance with qualified reviewers and tied to the intended use and consequences of false corrections. This protocol supplies no arbitrary passing percentage and makes no clinical claim.

## 6. Prevent leakage and overstatement

Use the eight-repetition candidate pilot only to debug alignment and annotation instructions. It prefers easier lighting/capture and is not a representative sample. Keep its subjects in development. Freeze a subject-level split before tuning; both cameras, every repetition, and every crop from a person stay together. With so few people, consider grouped leave-one-person-out evaluation and report each fold rather than a flattering random repetition split.

Summarize results by exercise variant, view, lighting, visible bystander category, and reference quality. Include unsupported domains and failures. Confidence intervals must respect person clustering; more crops do not create more people. Tiny group counts limit the conclusions even if there are many frames.

Do not pool angle accuracy, repetition recognition, evidence sufficiency, and correction quality into one “AI accuracy” number. Do not claim pull-up validation from a dataset without pull-ups. Do not claim general floor push-up performance from only table/incline push-ups. Do not infer suitability for injured users, clinical rehabilitation, or new demographics from this pilot.

## 7. Recording template

`annotation-template.csv` is intentionally header-only. Use one row per reviewer, claim, and evidence event; store actual rows in ignored `private/`. `official_correctness` is copied only from the pinned source, never guessed. Leave it hidden during the first annotation pass. `independent_verdict` is the reviewer's separate determination and may be unknown; it must not be filled using app status.

Record `review_stage` as `independent_movement`, `claim_review`, or `adjudication`; `claim_kind` as `measurement`, `visibility`, `timestamp`, `cycle`, `inspection_prompt`, `binary_correctness`, `named_fault`, or `correction`. Current app binary correctness/fault columns remain empty because those predictions do not exist. Use degrees for angle values, seconds for times, and source-frame numbers with a documented index base. Preserve reviewer rationales, uncertainty, and all abstentions.
