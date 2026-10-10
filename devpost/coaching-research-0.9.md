# Coaching evidence and validation audit — 0.9

Research checked 2026-10-10. This is an engineering research note, not clinical validation or an individualized exercise prescription.

## Decision

Build useful feedback around a visible movement over time: **what changed, where it happened, one practical cue, why that cue relates to the observation, and what the camera cannot establish**. Do not merely rename joint-angle measurements as coaching. Keep advice about muscle activation, scapular mechanics, joint stability, pain, or a person's safe range outside the pose model's claims. A general exercise reference supports a cue; it does not prove the cue applies to the uploaded person.

The existing 600-video evaluation does **not** support “80% accurate form correction.” It evaluates activity recognition and availability of observations. The new movement-review rules need independent annotations before any correction-accuracy claim.

## What the 600 recordings establish

The locked manifest has 600 distinct source videos: 200 each of pull-ups, push-ups, and squats; 360 training, 120 validation, 120 test. Each form label is null. The completed run used actual local model inference, including matching inference caches, with zero final failures. Original source IDs and exact file bytes do not cross splits; different IDs can still feature the same person. See [the original results](../evaluation/results/summary.md), [inference provenance](../evaluation/results/inference-v1.json), and [deployment decision](../evaluation/results/core-decision-v1.json).

| Existing held-out result | Meaning | What it cannot establish |
| --- | --- | --- |
| Baseline activity comparator: 99/120 = 82.5% correct | Recognizing one of three action labels, abstentions counted as misses | Whether a push-up, squat, or pull-up was performed well |
| Baseline accepted precision: 85.3%, Wilson 95% interval 77.8–90.6% | Precision among accepted action predictions | An 80% lower-bound guarantee, or coaching precision |
| Revised live core: 58 usable, 58 partial, 4 insufficient out of 120 | Evidence sufficient for full or limited review | 116 correct form assessments, or 58 correct corrections |
| Wrong-station usable: 0/240 trials | No observed wrong-station completion in this audit | Zero future mistakes, unrelated-action rejection, or injury safety |
| Countix: 10 independently annotated test intervals, MAE 1.8 reps | Counting performance inside those matched intervals | Reliable full-clip counts or form quality |

The supervised activity classifier was not shipped. It failed the predeclared selection/audit requirements. No reinforcement learning, policy optimization, or pose-model retraining occurred. New rules must not be tuned against the previously reported test outcomes and then called newly held out.

### Actual 0.9 movement-cue replay

The frozen new movement rules were replayed against all 600 actual cached recordings / 22,536 sampled frames. No videos were decoded again, no model/provider was called, no ground-truth labels were joined and no threshold was changed. The script verifies cache fingerprints, the locked manifest, equivalence of the measurement snapshot to current code, and that emitted interval endpoints are real sample timestamps. All temporal/source invariants passed. [Aggregate output](../evaluation/coaching-validation/coverage-0.9.json); reproduce with `node evaluation/coaching-validation/replay.mjs` on a machine retaining the ignored inference cache.

| Recordings | Specific correction | Specific positive observation | Any specific feedback | General practice / limitations only |
| --- | ---: | ---: | ---: | ---: |
| Pull-ups, 200 | 0 | 0 | 0 | 200 |
| Push-ups, 200 | 7 | 76 | 77 | 123 |
| Squats, 200 | 0 | 51 | 51 | 149 |
| All, 600 | **7** | **127** | **128** | **472** |
| Original test split, 120 | 1 | 28 | 28 | 92 |

Correction and positive-observation columns overlap; do not add them to obtain unique recordings. All seven corrections were `pushup-hip-position`. No pull-up swing/descent or squat/push-up timing correction fired. This is a substantial product-coverage limitation. It does not establish that those performances were correct, that the seven corrections were right, or that thresholds should be relaxed. Next work should inspect independently labeled development examples and compare real failures with detector assumptions; retain abstention where the evidence is insufficient. The original test breakdown is descriptive regression information, not a newly blind efficacy estimate.

## Exercise references translated into bounded cues

These are proposed observation-to-cue mappings, not measured fault-classification results. They require a stable visible track and the correct exercise variation. Each mapping needs expert review against actual footage.

| Exercise | Reference principle | Useful conditional feedback | Claims to avoid |
| --- | --- | --- | --- |
| Push-up | Maintain trunk alignment during lowering and pressing; avoid sagging or lifting hips independently | When sustained displacement is visible: “Your hips drift relative to your shoulders here. Try moving your trunk together on the next attempt.” Show the interval, not one flattering frame. | Inferring weak core muscles, prescribing an exact elbow flare angle, or forcing chest-to-floor depth from a silhouette |
| Pull-up | Controlled rise and descent, vertical alignment, reduced swinging | When lateral motion is visible relative to a stable hand position: “Your trunk moves sideways here. If you are practising a strict pull-up, let the swing settle before the next pull.” | Calling every kip incorrect regardless of goal; claiming scapular retraction or muscle activation was measured; insisting on a deeper hang after pain or instability disclosure |
| Squat | Controlled hip/knee movement and coordinated return | When hips rise visibly before the upper trunk: “Your hips start rising before your shoulders here. Try bringing them up together within a comfortable range.” | Declaring every forward lean a fault, prescribing one universal depth, diagnosing ankle restriction, or inferring knee tracking from a side-only view |

Sources: [ACE push-up](https://www.acefitness.org/resources/everyone/exercise-library/41/push-up/), [ACE pull-up](https://www.acefitness.org/resources/everyone/exercise-library/191/pull-ups/), and [ACE bodyweight squat](https://www.acefitness.org/resources/everyone/exercise-library/135/bodyweight-squat/). ACE describes particular exercise variants and includes alternatives; the app must not turn one demonstration into a universal anatomical template. The proposed temporal rules and wording above are engineering interpretations, not validations published by ACE.

AAOS describes shoulder instability as recurrent looseness, slipping, or dislocation, with causes and management requiring clinical context. A visually extended arm does not establish joint stability. For disclosed pain, dislocation, surgery, or instability, suppress progression/range advice and suggest individualized clinical guidance. Do not ask the person to reproduce painful motion to improve the recording. [AAOS chronic shoulder instability](https://www.orthoinfo.org/diseases--conditions/chronic-shoulder-instability/)

## What other products actually validated

| System / primary evidence | Measured endpoint | Transferable method and boundary |
| --- | --- | --- |
| Kaia Motion Coach, prospective cohort | 24 people with knee/hip osteoarthritis; 552 exercise segments across six therapeutic exercises. Blinded physiotherapists assessed execution. Mean app–therapist agreement 82.8%, therapist–therapist 83.3%; predeclared noninferiority margin 5 percentage points. | Separate pose estimation from an expert-configured spatiotemporal rule system. Compare both agreement and Cohen κ against independent raters. This is a particular app, clinical population, exercise set and protocol—not ASTER's accuracy or general sports-technique validation. |
| Kemtai / ALYN March 2025 report summary | Markerless estimates compared with VICON; 12 anatomical points across 11 controlled movements in healthy adults; RMSD reported as the accuracy endpoint. | Validate measurement geometry against motion capture separately from whether coaching is useful. The accessible summary does not establish per-fault precision, temporal correction quality, or ASTER clinical safety. Full report methods/results were not verified here. |
| Sword digital care evidence | Its published clinical program studies assess outcomes such as pain, function and engagement; a cited 2023 randomized trial involved 140 participants. Earlier primary protocols describe wearable motion trackers plus clinician-directed treatment. Current product pages describe Vision AI under clinician oversight. | Program outcome evidence and sensor-based trials must not be relabeled as validation of camera-only named-fault detection. The bounded primary-source check did not locate an independently labeled camera-only pull-up/push-up/squat correction benchmark. That is an evidence gap in this review, not a claim that none exists. |

Primary sources: [Kaia study, JMIR](https://www.jmir.org/2021/7/e26658/), [ALYN hospital research summary](https://www.alyn.org/Kemtai-more-info), [Kemtai computer-vision description](https://kemtai.com/our-computer-vision/), [Sword trial account and linked publication](https://swordhealth.com/articles/nature-study), [registered Sword protocol with sensor specification](https://cdn.clinicaltrials.gov/large-docs/60/NCT03648060/Prot_SAP_001.pdf), [current Sword Thrive oversight and outcomes](https://sword.com/solutions/thrive). The Nature publisher page itself was inaccessible through this research tool; do not imply its full methods were inspected.

## Validation that would answer the user's actual question

Use the [new coaching protocol](../evaluation/coaching-validation/protocol.md) before claiming correctness. Independent experts first label visible movement and appropriate advice without app predictions. A separate blinded comparison then rates the actual old/new feedback on the same clips. Keep recording/person/source groups together across splits and compare paired outputs, not unrelated sets. Primary endpoints are supported-cue precision, missed actionable patterns, temporal alignment and potentially harmful or unsupported advice. User helpfulness and observed improvement on a later recording are separate endpoints, not substitutes for correctness.

Existing [form-dataset feasibility work](../evaluation/form-validation/README.md) identified richer push-up/squat annotations in FitAQA and binary correctness in REHAB24-6. Neither gives automatic pull-up coverage. Public annotations do not grant video rights. Exact asset/alignment checks are required; the two source-ID-only overlaps with the locked 600 have unequal hashes and cannot transfer labels. Keep the existing held-out candidate untouched.

## Optional Nebius explanation service

The official [OpenAI-compatible API reference](https://api.tokenfactory.nebius.com/docs) exposes `POST /v1/chat/completions` and `GET /v1/models`. Use the fixed HTTPS host `api.tokenfactory.nebius.com`. The [official cookbook example](https://github.com/nebius/nebius-physical-ai/blob/main/docs/hackathon-cosmos3-reasoner.md) shows the versioned routes. Marketing SDK snippets sometimes omit `/v1`; the explicit REST endpoint avoids that ambiguity.

Do not infer hosted vision capability from an upstream model's architecture. The [official Qwen route page](https://nebius.com/services/token-factory/models/qwen-models-inference) explicitly says Qwen3.5 is multimodal upstream while its current hosted catalog route is text-to-text. A [general vision solution page](https://nebius.com/solutions/vision) and a [rapidly changing cookbook model list](https://github.com/nebius/token-factory-cookbook/blob/main/models/README.md) describe broader capabilities, not a guarantee for every model/account. Verify the exact configured ID in the authenticated catalog and its route modality before any future image request.

For this revision, use **text only** and require an explicitly configured catalog-verified model. The official Qwen page lists Qwen3-30B-A3B-Instruct-2507 as a cost-sensitive text candidate, but it is not silently selected by code. Server-only environment:

```dotenv
NEBIUS_API_KEY=<private Token Factory key>
NEBIUS_COACH_MODEL=<exact model id verified in your account catalog>
```

No `VITE_` prefix, browser key, arbitrary base URL, image, video, body photo, full journal, or stored health history. The service only sees a consenting user's bounded question and a source-grounded review card. Health disclosures caught by the application or conservative keyword guard bypass the provider. The keyword guard is not a comprehensive privacy classifier: UI consent and the explicit injury context still matter.

An authorized authenticated **read-only** `GET /v1/models` check succeeded on 2026-10-10 and returned `Qwen/Qwen3-30B-A3B-Instruct-2507`. That exact model ID was set in the ignored server environment, preserving other settings. No key or authorization header was logged. Catalog presence confirms access/listing, not successful generation, quality, or image support.

`frontend/server/coachingService.ts` deliberately lets the model choose existing answer sections and a small set of introductions. The server renders the actual observation/cue/explanation. Extra text, unknown keys, fabricated cue IDs, invalid JSON or network failures produce a local answer; no model-written prescription reaches the user. Requests have a 25-second deadline, 180 output-token cap and 16 KiB response bound. Authentication, consent, persistent rate limits and reconstructing the card from server-reviewed data belong to the calling endpoint.

### Live provider verification and fix

After the research-only check, three explicitly authorized small synthetic requests were made. They used a predefined general push-up practice card and a synthetic question; no real user question, health context, video, image or landmark data was sent. The first two attempts returned `local / invalid-response`: arbitrary JSON mode produced prose and object-valued parts instead of enum selections. The independent server validator correctly rejected that output. This was a schema-following failure, not truncation (diagnostic finish reason `stop`, 231 prompt / 117 completion tokens).

Following Nebius's [official structured-output guide](https://docs.tokenfactory.nebius.com/ai-models-inference/json), the request now supplies strict `json_schema` with exact cue-ID and section-name enums, required properties and no additional properties. Local validation remains mandatory. The third request succeeded in 1.663 seconds: `provider-selected`, sections `why` and `cue`, 337 prompt tokens (224 cached), 35 completion tokens, 372 total. No monetary charge was inferred from token counts. The first attempt's usage was not retained, so no exact aggregate cost is claimed. The ignored verification artifact records the successful synthetic response and usage.

Final checks: **8 isolated service tests**, **15 mocked account/API route tests**, and **1 actual provider selection test** passed; strict server TypeScript validation passed. The route tests cover signed-in identity, consent, origin, source/exercise matching, rejecting oversized questions, ignoring client-authored card/media fields, each persistent rate budget, local missing-provider behavior and health-question bypass. The Windows Playwright worker emitted a teardown `UV_HANDLE_CLOSING` assertion after the live test passed with process exit 0; this does not invalidate the observed response, but full-browser hosted behavior remains a separate integration check. These tests establish bounded transport/selection behavior, not coaching correctness or clinical efficacy.
