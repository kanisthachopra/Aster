# Movement research data and source ledger

Version: 1.1.0 · inspected: 2026-10-10. Companion to [movement understanding](movement-understanding.md).

This is the project's evolving **research data.md**. It records what was actually inspected and distinguishes a technique reference, an engineering constraint, a model capability statement and an experimental result. A useful source is not automatically a detector label or proof of Aster's accuracy.

## Inspected technique and clinical-boundary sources

| ID | Primary source and inspected content | Allowed use / limitations |
| --- | --- | --- |
| ACE-PU | [American Council on Exercise — Push-up](https://www.acefitness.org/resources/everyone/exercise-library/41/push-up/), written steps 1–5 | Trunk coordination, controlled lowering/pressing and setup education. It includes hand/elbow variation, so it does not justify one universal elbow angle. Copyrighted reference; link and paraphrase, do not redistribute its images as an app dataset. |
| ACE-PL | [ACE — Pull-ups](https://www.acefitness.org/resources/everyone/exercise-library/191/pull-ups/), written setup, upward and downward phases | Strict-pull-up control and reference sequence. Shoulder-blade instructions are coaching concepts, not independently measured by the pose skeleton. No individualized safe-range inference. |
| ACE-SQ | [ACE — Bodyweight squat](https://www.acefitness.org/resources/everyone/exercise-library/135/bodyweight-squat/), written steps 1–6 | Coordinated hip/torso rise, foot stability and knee direction. Source instructions describe a reference bodyweight movement, not a universal numeric template or validation of image-based assessment. |
| NSCA-SQ-VAR | [Rusin, PT, DPT, CSCS; DeBell, MS, DC — Anthropometrical Considerations for Customizing the Squat Pattern](https://dxpprod.nsca.com/contentassets/65ff7dabfee140d4876c556ddb748fef/ptq-5.4.1-anthropometrical-considerations-for-customizing-the-squat-pattern.pdf), NSCA Personal Training Quarterly 5.4, all six extracted pages | Explains why anatomy, stance and toe orientation vary. Useful counterweight to identical-silhouette grading. Its hands-on hip assessment is not a validated webcam test and must not be translated into self-diagnosis. Demographic averages cannot select an individual's stance. |
| AAOS-SHOULDER | [AAOS OrthoInfo — Chronic Shoulder Instability](https://www.orthoinfo.org/diseases--conditions/chronic-shoulder-instability/), causes, symptoms, examination and treatment text; authored/updated William Reuben Aibinder, MD, FAAOS; reviewed Mary K. Mulcahey, MD, FAAOS | Pain, slipping and recurrent dislocation require individual clinical assessment; appearance alone cannot resolve them. Supports routing such questions away from automated range prescriptions, not diagnosing instability. |

## Pose and timing sources

| ID | Primary source and inspected content | Implementation implication |
| --- | --- | --- |
| MP-WEB | [Google MediaPipe Pose Landmarker web guide](https://developers.google.com/edge/mediapipe/solutions/vision/pose_landmarker/web_js), configuration, video loop, outputs and worker note; page marked updated 2026-08-17 | Separates detection, presence, tracking and landmark visibility. Normalized x/y use image dimensions; world coordinates are model outputs. Run blocking detection away from the UI thread. Visibility must not be displayed as “form confidence.” |
| MP-OVERVIEW | [Google Pose Landmarker overview](https://developers.google.com/edge/mediapipe/solutions/vision/pose_landmarker) | Establishes the intended pose-landmark task. It does not provide labels or validation for the exercise faults proposed here. |
| BLAZE-2020 | [Google Research — On-device, real-time body pose tracking with MediaPipe BlazePose](https://research.google/blog/on-device-real-time-body-pose-tracking-with-mediapipe-blazepose/), detector/tracker and evaluation discussion | Occlusion, poses and clothing are tracking challenges. Its landmark-localization benchmark is not coaching accuracy. The original detector's visible-head assumption is historical, not proof that every current model requires an uncropped head. |
| VIDEO-PTS | [WICG requestVideoFrameCallback proposal](https://wicg.github.io/video-rvfc/), callback scheduling, metadata and missed-frame behavior | `mediaTime` is frame presentation time; `presentedFrames` can reveal missed callbacks. Display callbacks are best effort. Preserve decoded-frame timing; do not equate inference/network duration with exercise duration. This is a Community Group draft, not a W3C Recommendation. |

## Public demonstration media

[United States Navy push-up demonstration on Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Navy-seal-buds-training-push-ups.ogv) is the already acquired public-domain fixture. Its source identifies U.S. Navy official-duty authorship and the [public-domain mark](https://creativecommons.org/publicdomain/mark/1.0/). Local provenance is in ignored `frontend/artifacts/real-exercise-provenance.md`. The local seven-second MP4 is original source seconds 81–88, transcoded without audio. This is a demonstration, **not independently annotated correct/incorrect form ground truth** and not an endorsement.

For this task, a decoded public frame was visually inspected; four upper-body crops were extracted at local times 1.0, 2.2, 3.4 and 4.6 seconds for the expressly authorized provider check. No user recording, private face, health context or unauthorized media was sent. Crops are ignored artifacts, not shipped assets. No YouTube or TikTok video was watched in this research pass; no claims are based on an unseen video. Future coach-video entries must record the reviewed segment and redistribution permission separately from the right to link.

## Nebius provider ledger

Checked 2026-10-10 against both the authenticated catalog and primary hosted metadata. No secret values were printed or written into these documents.

| Evidence | Actual finding |
| --- | --- |
| Authenticated `GET https://api.tokenfactory.nebius.com/v1/models` | Returned 25 model IDs, including `openbmb/MiniCPM-V-4_5`; this API response did not include modality fields. Availability alone is insufficient to infer vision capability. |
| [Official public model metadata](https://tokenfactory.nebius.com/api/public/models_info), discovered through the official catalog HTML's machine-readable dataset link | MiniCPM is explicitly active `image2text`, image use case, JSON mode, 32,000-token context and eu-north1. Listed prices at inspection: $0.658/M input tokens and $1.11/M output tokens. These prices and deployments can change. |
| Same metadata: Gemma and Qwen | Gemma has `text2text` type but an image use case; the successful actual request below resolves image-input capability for the tested route. Qwen3.5's description mentions upstream multimodality while its hosted entry is text2text without image use case. Do not infer its route capability from the upstream description. |
| [Official vision request example](https://docs.tokenfactory.nebius.com/api-reference/examples/vision-capabilities) | `POST /v1/chat/completions`, user `content` array containing text and `image_url` parts; images can be URLs or base64 data URLs. Its older Qwen2-VL example is absent from the current authenticated catalog. |
| [Official chat completion API](https://docs.tokenfactory.nebius.com/api-reference/inference/create-chat-completion) | Documents response formatting, output token limits, streaming and storage parameter. Provider/model-specific schema support still requires an actual test. No continuous-camera or native video endpoint was verified in this task. |
| [Upstream MiniCPM](https://github.com/OpenBMB/MiniCPM-V) | Describes image/video capabilities, but is not proof of the provider's exact endpoint behavior, performance or form accuracy. |

### Actual bounded public-image requests

Five expressly authorized requests used the official base64 `image_url` format, a 500-token output cap and `store:false`. Initial calls used an enum-only provider JSON schema; later diagnostics used `json_object` with the allowed structure in the instructions and strict application validation. Requested fields were exercise category, visible region names, supplied frame indices and an uncertain/extended/bent arm-shape category. No free-form coaching, diagnosis or safe-range advice was requested.

| Attempt | Response | Interpretation |
| --- | --- | --- |
| 1 — MiniCPM, four images, strict schema | HTTP 400 in 1.286 s: grammar did not implement `uniqueItems` | Enforce uniqueness in application validation. No completion or usage returned. |
| 2 — MiniCPM, four images, strict schema without `uniqueItems` | HTTP 500 in 1.198 s | Provider internal error; no output or usage. |
| 3 — MiniCPM, four images, `json_object` | HTTP 500 in 1.426 s | Simpler response formatting did not resolve the error. No output or usage. |
| 4 — MiniCPM, one image, `json_object` | HTTP 500 in 0.987 s | Removing multi-image input did not resolve it. Root cause remains unverified; no output or usage. |
| 5 — Gemma, four images, `json_object` | **HTTP 200 in 3.869 s; 1,217 input + 210 output = 1,427 tokens; finish reason `stop`** | Actual image input and JSON output demonstrated. Exact output keys, enums, unique region values and frame indices 0–3 passed application validation. |

**Feasible tested route: `google/gemma-3-27b-it` on `/v1/chat/completions`, image data URLs, `response_format:{type:"json_object"}`, followed by strict server validation.** The output identified push-up context and visible head/shoulders/elbows/hands without claiming cropped knees/feet. All four decoded input images were visually inspected. However, the first two `arms_more_bent` labels look questionable: those frames also show substantially extended arms. This is a transport/context demonstration, not proof of temporal understanding, correction accuracy or reliable motion-phase labels. Do not use its phase guesses as ground truth or override pose evidence.

The catalog's Gemma prices at inspection were $0.10/M input and $0.30/M output tokens, giving a **list-price estimate of $0.0001847** for the successful call, not a billing statement. No zero-cost claim for errors: they omitted usage. Ignored `frontend/artifacts/nebius-vision-check/result*.json` preserves all five outcomes, request shapes, input hashes, timings and the visual-audit caveat without secrets or base64 image contents. That ended the five-call exploratory diagnostic sequence; the sixth, final-service check is appended below. MiniCPM is officially listed but remained unusable in these bounded tests; avoid silent retries or fallback to fabricated observations.

`NEBIUS_API_KEY` remains server-only. A distinct `NEBIUS_VISION_MODEL=google/gemma-3-27b-it` setting should be separate from the already tested text selector. No environment setting was changed by this research task. `store:false` is a request parameter, not evidence of comprehensive provider retention/no-training policy; verify current contractual data handling before promising that to users.

## Validation and revision ledger

Technique-source agreement is not detector validation. The [coaching protocol](../evaluation/coaching-validation/protocol.md) specifies independent labels and assessor review. The [form-dataset audit](../evaluation/form-validation/README.md) records which public labels/media are genuinely obtainable and their licenses; some research-only datasets cannot become commercial product assets. The locked 600 videos lack form-fault ground truth, so cue coverage or exercise recognition cannot support an “80% correct corrections” claim.

Each new source entry must retain: stable ID, canonical URL, organization/author qualifications, inspection date, actual text/video segment inspected, paraphrased claim, supported variations, contradictory evidence, license/reuse status, and the cue IDs it supports. Each experiment must retain input provenance/consent, dataset split, code/model/prompt/knowledge versions, metrics with denominators, limitations and release decision. Do not overwrite failed experiments when a later attempt succeeds.

| Version | Date | Change |
| --- | --- | --- |
| 1.0.0 | 2026-10-10 | Initial inspected source ledger, current Nebius metadata and five bounded public-image diagnostics: Gemma route success with important phase-interpretation caveat; MiniCPM failures retained. |
| 1.1.0 | 2026-10-10 | One further exact-service public-image verification; current limited-view rule scope and source-hash requirements documented. |

## 1.1 exact-service verification and rule audit

After the five exploratory diagnostics above, one additional expressly authorized request used the finished [visionContextService.ts](../frontend/server/visionContextService.ts), its exact prompt and application validator, `google/gemma-3-27b-it`, and the same four public-domain Navy JPEG crops. **This makes six actual provider requests in this research work, not five.** No private recording, health context or free-text question was supplied. No additional retries occurred.

The service completed in **2.528 seconds** and accepted precisely:

```json
{
  "mode": "visual-context",
  "context": {
    "exerciseObserved": "pushup",
    "view": "angled",
    "visibleRegions": ["head", "shoulders", "elbows", "hands", "hips"],
    "frameIndices": [0, 1, 2, 3]
  }
}
```

This proves that the final request/response path can return an accepted context result. It does not validate every region judgment: `hips` was omitted in the earlier successful diagnostic and now included, near the crop boundary. Keep local visibility/geometry gates authoritative for any specific cue. The final service intentionally discards usage and raw provider payload; token counts and billing for this sixth request were not retained. Ignored proof: `frontend/artifacts/nebius-vision-check/final-service-verification.json`. The fifth-call usage estimate above remains associated only with that fifth call.

Read-only inspection of the current `partialMovementReview.ts` and `twoPointMovementReview.ts` confirms implemented three-point chain timing, two-point segment tempo, repeated projected path, and steady-support moving-episode fallbacks. These descriptions and their uncertainty rules are summarized in [the understanding update](movement-understanding.md#11-implementation-update-useful-observations-from-fewer-points). They are code behavior, not source-authorized fault labels or clinical evidence. Future coverage artifacts must include hashes for those two modules and `movementReview.ts`; prior 600-video 0.9 coverage cannot be silently reused for this implementation.

### Hosted application check, 10 October 2026, 05:54 UTC

After deployment, a disposable signed-in account previewed and explicitly shared six **full original** public Navy frames through the actual UI and authenticated route. The hosted Gemma response was accepted as push-up context with supporting frame indices and no advice. The screenshot shows the returned visible regions; usage and provider latency were not retained, so no new cost/latency claim is made. This is the **seventh image request in this revision**. A separate hosted text-explanation request also succeeded. All earlier failed requests remain in the ledger. The account was deleted after journal/version/audio verification. No private pixels or injury information were sent. See [hosted verification](../devpost/verification-0.10.md#hosted-verification).
