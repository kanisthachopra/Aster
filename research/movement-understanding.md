# Movement understanding

Version: 1.1.0 · reviewed: 2026-10-10 · status: researched coaching specification, not a validated fault classifier.

This is the project's evolving **understanding.md**: what Aster may understand from exercise footage, what useful feedback should sound like, and what must be demonstrated before a new claim ships. [Movement sources](movement-sources.md) is the corresponding **research data.md** with inspected references, provider checks, and provenance. These files are knowledge artifacts; editing them does not automatically change application behavior or train a model.

## Product promise

Help someone understand the visible part of a movement, identify a specific moment worth reviewing, and try one relevant adjustment. A cropped recording can contain useful evidence. Missing ankles need not invalidate clearly observed elbow movement; missing ankles also cannot become evidence about foot position. Each finding carries its own visibility and timing requirements.

Use four distinct result types:

1. **Observed:** a directly supported description, with actual frame indices/timestamps and the visible region.
2. **Possible adjustment:** a source-backed cue conditional on that observation and the chosen exercise variation.
3. **Practice idea:** general technique education, explicitly not a discovered fault.
4. **Not assessable:** the exact hidden feature and, if helpful, a specific change to framing.

Good feedback: “Your hips move ahead of your shoulders in this visible section. Try pressing your trunk upward together. This view does not show your feet.” Bad feedback: “Weak core detected; your form is unsafe.” Descriptions must not promise injury prevention or diagnose a cause from appearance.

## Coaching knowledge matrix

The technique principles below come from the linked references. View requirements, counterexamples, evidence gates and proposed wording are **engineering interpretations to validate**, not claims that the source tested our detector. None of these rows supplies a universal numeric threshold.

| Knowledge ID / source | Practical cue and reason | Evidence required | Variations, counterexamples and limits |
| --- | --- | --- | --- |
| PU-TRUNK / [ACE push-up](https://www.acefitness.org/resources/everyone/exercise-library/41/push-up/) | Move the trunk together through lowering and pressing; this focuses attention on maintaining the push-up body shape. | Side or sufficiently oblique view; visible shoulder, hip and knee/ankle chain through an actual movement interval. Compare within the same person's repetition. | Knee and incline push-ups use different support points. A cropped upper body cannot establish whole-body alignment. Perspective, loose clothing and pelvis landmarks can imitate drift. |
| PU-ARMS / ACE push-up | Use a controlled lowering and return. A clearly labeled timing observation can help the person notice a rushed transition. | Shoulder–elbow–wrist chain with repeated flexion/extension, stable camera and real timestamps. | Arm shape alone does not establish chest depth, hand pressure or whole-body form. Intentional explosive, eccentric-only, paused and rehabilitation variants must not be graded as ordinary repetitions. |
| PU-HANDS / ACE push-up | Review hand placement as setup education when the hands and shoulders are visible. | Hands, shoulders and floor orientation; separate near/far limbs. | The source describes more than one hand/elbow configuration. Do not prescribe a single elbow angle or infer wrist loading from a landmark. |
| PL-CONTROL / [ACE pull-up](https://www.acefitness.org/resources/everyone/exercise-library/191/pull-ups/) | For a strict pull-up, minimize unintended swinging and control the return. This keeps attention on the intended pull rather than momentum. | Bar/hands as a stationary reference; shoulder/hip trajectory across a complete local cycle. Actual descent timestamps for timing feedback. | Kipping and other intentional momentum variants have different goals. Camera motion, grip changes, assistance or bent knees can mislead a swing rule. Ask which variation is intended. |
| PL-ARMS / ACE pull-up | A visible arm cycle can support feedback about the observed bend/straighten sequence. | Shoulder–elbow–wrist visible over time, hands stable and enough vertical motion to establish a pull. | Elbow extension is not evidence of safe shoulder extension, scapular retraction, muscle activation or complete range. Hidden bar/chin means no chin-over-bar conclusion. |
| PL-RANGE / ACE pull-up; [AAOS](https://www.orthoinfo.org/diseases--conditions/chronic-shoulder-instability/) | Explain the reference movement while declining to prescribe an individual's safe hang depth. | A clinician or qualified coach may need history and examination beyond this product. | Pain, slipping, prior dislocation or clinician restrictions override generic coaching. Do not use appearance to diagnose instability or tell the person to push farther. |
| SQ-RISE / [ACE squat](https://www.acefitness.org/resources/everyone/exercise-library/135/bodyweight-squat/) | Let hips and torso rise together. The cue directs attention to coordination through the ascent. | Side/oblique shoulder–hip–knee chain across a visible ascent, with camera stability. | Forward torso inclination is not inherently a fault; load placement and body proportions matter. Shoulder/hip points do not resolve lumbar curvature. |
| SQ-FEET / ACE squat | Review a stable foot base and knee direction relative to the feet. | Front/oblique view of both hips, knees, ankles and toe/heel regions; enough image detail and floor context. | A side crop cannot establish inward knee motion. An intentional heel wedge is not an accidental heel lift. Do not infer pressure distribution or declare “knees past toes” wrong. |
| SQ-RHYTHM / ACE squat | Notice changes in lowering/return rhythm; offer deliberate control as a practice cue when that matches the user's goal. | Hip–knee–ankle cycle with real timing. This can remain useful when the head/arms are cropped. | Faster motion does not prove lost control. Tempo/paused squats, partial-range practice and different loads are counterexamples. No compulsory speed ratio without validation. |
| SQ-VARIATION / [NSCA individual squat patterns](https://dxpprod.nsca.com/contentassets/65ff7dabfee140d4876c556ddb748fef/ptq-5.4.1-anthropometrical-considerations-for-customizing-the-squat-pattern.pdf) | Ask about the variation and comfortable stance rather than force one silhouette. | User-declared variation/goal; specialist assessment for anatomical questions. | Stance, toe orientation and depth differ with anatomy. Do not infer hip anatomy, ethnicity, gender, or an ideal stance from photos. Do not automate the article's hands-on clinical tests. |

## Partial views: answer the question that is actually visible

| Visible evidence | Potentially useful output | Still unavailable |
| --- | --- | --- |
| Push-up upper body: shoulder, elbow, wrist | Visible elbow cycling, limited arm timing, observed hand position | Whole-body rigidity, foot support, lower-back curvature, exact chest clearance |
| Pull-up upper body, hands and bar | Arm cycling and vertical travel; local up/down timing if endpoints exist | Lower-body swing when hips/legs are absent; exact grip force, scapular motion, safe hang depth |
| Squat lower body: hips, knees, ankles | Local cycle rhythm; visible knee/ankle trajectory | Trunk coordination when shoulders are absent; spinal alignment, pressure distribution |
| One limb intermittently hidden | Review a continuous interval where that chain is visible, with its side labeled | Claims spanning a gap or fabricated coordinates bridging an occlusion |
| A single photograph | Static visible setup and framing suggestions | Repetition count, timing, control, movement cause, improvement over a repetition |

“Partial” describes coverage, not automatic failure. Select at most one or two genuinely supported coaching points. A reference demonstration is an educational comparison, not an exact pixel/angle template every body must match.

## Evidence rules for implementation and review

- Keep exercise recognition, landmark visibility, movement observation and coaching appropriateness separate. A model's confident exercise label does not establish correct form.
- Preserve frame presentation timestamps and the original image aspect ratio. Do not calculate tempo from network arrival times or assume equally spaced samples. Frame callbacks can miss frames under load; monotonic time and gap checks remain necessary. [WICG frame timing](https://wicg.github.io/video-rvfc/).
- MediaPipe visibility is a visibility likelihood, not a correctness score. Its normalized image coordinates and estimated world coordinates require different treatment; neither is an individualized clinical measurement. [MediaPipe web guide](https://developers.google.com/edge/mediapipe/solutions/vision/pose_landmarker/web_js).
- Require a stable same-person track, sufficient joint visibility, plausible continuous geometry and actual interval support for the particular cue. Multi-person ambiguity, impossible jumps or sustained occlusion invalidate that chain, not necessarily every other chain.
- A VLM may propose visible context or a candidate observation with supplied frame IDs. It must not manufacture a timestamp, promote hidden joints to visible, override a failed temporal gate, or convert a guessed phase into a completed repetition.
- Store the evidence span and knowledge/model/rule versions with the result. Explain disagreement between local pose and provider context through uncertainty or abstention. Do not silently choose whichever sounds more confident.
- No inferences of ethnicity, disease, muscle activation, ligament integrity, body-fat percentage, nutrition requirements or safe joint range from appearance. Voluntary information is not permission for unsupported advice.

## Near-real-time Nebius assistance

Proposed architecture: continuous local pose tracking and inexpensive quality checks; occasional explicitly consented, bounded image batches for context; reviewed coaching cards grounded in accepted observations. Keep the local review usable without Nebius. Give the user a clear preview of which frames will leave the device. Continuous camera capture does not imply continuous provider upload.

Candidate model and actual test status are in [the provider ledger](movement-sources.md#nebius-provider-ledger). `stream:true` streams generated tokens; it does not demonstrate a real-time video API or low-latency coaching. Measure end-to-end p50/p95 latency, payload size, cost and cancellation before choosing a request cadence. Do not send a new batch while one is pending; drop stale work rather than build a queue. A moving person should not receive late, contradictory commands from an old frame batch.

Use strict server validation: bounded image count/bytes/dimensions, re-encoded image data, allowlisted model, fixed endpoint, enum-only context, known frame IDs, deadlines, authenticated budget, and no provider-supplied URL/tool execution. Enforce unique visible-region values server-side because provider schema support may be incomplete. No credentials or private signed media URLs in logs.

The initial `visionContextService.ts` implements **context only**: exercise category, camera view, visible-region names and at least two supporting input-frame indices. It rejects phase labels, defects, advice and extra output fields. Its isolated tests validate the input/transport/output boundaries, not whether a model's visual description is true. Authentication, explicit image consent, injury bypass and persistent budgets belong to the calling route. Local temporal checks remain necessary before a specific correction can appear.

## How understanding improves over time

1. **Source proposal:** add the exact URL, author/organization, inspection date, content inspected, license and limits to the source ledger. A video needs an actually reviewed timestamped transcript/segment; a search title is not evidence.
2. **Knowledge review:** draft a cue card with variation, observation, reason, required joints/view/temporal support, counterexamples and stop conditions. Mark proposed until a qualified reviewer approves it.
3. **Independent examples:** collect permitted positive, negative, ambiguous and cropped examples; record annotator disagreement. Keep source video/person groups together. Do not mine the held-out set to invent thresholds.
4. **Implementation:** freeze the candidate detector/prompt/card versions and source hashes. Test geometry, gaps, aspect ratio, mirroring, wrong exercises, variant handling and evidence timestamps.
5. **Evaluation:** blinded experts label whether the named observation is present and assess whether the proposed cue is justified/helpful. Report per-cue precision, recall on assessable examples, abstention/coverage, temporal localization and harmful/unsupported advice separately. Include confidence intervals and denominators, and compare with the current release.
6. **Release:** record accepted/rejected changes and regressions, then release a versioned snapshot. A wording change is patch, a new compatible cue/source is minor, a changed claim/gating contract is major. Keep retired entries and migration notes instead of rewriting history.

Private uploaded clips are **not automatic training data**. Analysis consent, account storage and research contribution are separate choices. A contribution requires explicit opt-in, a defined purpose, retention and deletion controls, isolated research access, and split assignment before training. Deleting a contribution removes future research eligibility and queued jobs; track derived artifacts and disclose any irreversibility before a training use. Personal history may personalize comparisons within the user's account without joining a shared training corpus.

The existing 600-video data has no independent form-fault labels. The earlier 0.9 replay measured cue coverage only, not correction accuracy. Its counts do not describe newer partial-view rules without a fresh versioned replay. See [coaching evaluation protocol](../evaluation/coaching-validation/protocol.md) and [dataset feasibility](../evaluation/form-validation/README.md). No evidence currently supports an “80% correct form coaching” claim or a trained reinforcement-learning policy.

## Change log

| Version | Date | Change | Verification |
| --- | --- | --- | --- |
| 1.0.0 | 2026-10-10 | Initial evidence matrix, partial-view boundaries, provider investigation and update protocol | Inspected primary text/PDF/docs; current catalog metadata; bounded public-fixture provider checks. No private clips or new training. |
| 1.1.0 | 2026-10-10 | Document implemented three-point and two-point limited-view observations; exact final vision-service request verified | Read current detector modules; one additional public-fixture request passed final validator. No coaching-accuracy claim. |

## 1.1 implementation update: useful observations from fewer points

The current local review has an explicit fallback sequence in [partialMovementReview.ts](../frontend/src/analysis/partialMovementReview.ts) and [twoPointMovementReview.ts](../frontend/src/analysis/twoPointMovementReview.ts). These are implemented engineering rules, not new conclusions asserted by ACE or independent evidence of correctness.

| Available points | Implemented observation | Claim boundary |
| --- | --- | --- |
| Shoulder–elbow–wrist, or hip–knee–ankle | Local projected chain timing; a repeatable bending/returning path and timing across two adjacent movements | May describe the visible chain. Does not establish full-body form, full range or a completed exercise repetition. |
| Elbow–wrist for push-up/pull-up; knee–ankle for squat | A quicker projected segment return when a sufficiently stable visible return exists | Two endpoints cannot measure elbow/knee angle or identify the physical lifting/lowering phase. The cue stays conditional on the intended movement. |
| Same two-point segment across two matching cycles | A repeatable image-space return/path, allowing comparable repeated foreshortening | Similar projected paths are not proof of the same 3-D movement. Repeated camera motion can still imitate a pattern. |
| Same two-point segment during a moving episode without a completed return | A relatively steady visible hand/ankle while the forearm/shin moves | This describes visible support only: not grip force, pressure, a planted whole foot, a full return, or correct exercise identity. |

The two-point module checks actual continuous timestamps, visible endpoints, plausible segment scale/change, stationary observed support and sustained movement. It rejects gaps, jumps and certain tracking/exercise conflicts. Tempo adds a projected-length stability check; repeated-path comparison checks both endpoint and path profiles. No missing point is synthesized. Profile interpolation is only between adjacent samples inside an already accepted continuous run.

The three-point branch is attempted first; two-point observations are a fallback when it provides none. These findings do not change the report's completion status or repetition count. A quiet scene, insufficient movement or unsupported crop can still produce no specific observation. The thresholds are fixed engineering hypotheses, not coach-defined universal limits or empirically calibrated confidence scores.

Future descriptive replays must hash **all three** runtime modules: `movementReview.ts`, `partialMovementReview.ts` and `twoPointMovementReview.ts`. The older 0.9 coverage report predates these fallbacks and cannot be quoted as their measured coverage. Synthetic geometry tests establish rule behavior; independently labeled real footage is still required to measure whether an observation or cue is correct and useful.

The exact final vision-context service also passed a public-image request (2.528 seconds). It returns only context, never these local findings. Its inclusion of `hips` differed from the earlier successful contextual diagnostic on the same crops; a boundary region can be ambiguous. Provider-listed visibility must not override a missing/low-quality local point or expand a correction's evidence chain.

The final tempo checks also abstain when a sustained pause makes elapsed phase time misleading. Independent five-second-hold tests cover waiting before and inside either direction, plus genuinely different movement speeds without a pause. A hold is not time spent moving; treating it as such can invent a speed correction.

The actual-video [crop/recovery audit](../evaluation/cropped/README.md) did not yield additional limb cues from the new rules. Neither IMAGE/padding nor the larger Heavy model solved the difficult private clips, so both remain experimental. This identifies a tracker/coverage gap rather than validating a confident correction. The [hosted application check](../devpost/verification-0.10.md#hosted-verification) verifies public-image context and journal versioning, not private-crop success. The sources and checks must keep improving through the review process above.

### What the independent tracker comparison taught us

MoveNet Thunder was also tested locally with the same original frames and downstream 0.65 screen, using only its actual 12 limb/torso points. It did not yield useful feedback on the difficult push-up. Inspected pixels show that a hand/forearm can be present even when the detector assigns low keypoint confidence. Human-visible anatomy and accepted machine evidence are different conditions; a failure must explain that difference rather than claim the person is absent or the exercise is wrong.

The [official model card](https://storage.googleapis.com/movenet/MoveNet.SinglePose%20Model%20Card.pdf) describes a single-person model that can estimate occluded points. Its scores do not represent MediaPipe visibility and are not calibrated to this app's correction reliability. The card's general filtering recommendation is not a validated coaching threshold. Lowering a number until feedback appears would not establish correctness. A future alternative needs independently annotated visible-joint positions, cropped/occluded controls, person-assignment checks and useful-cue evaluation. Single-person output alone cannot reject ambiguity when another exerciser is present. The candidate remains experimental, with no app dependency or production model change.
