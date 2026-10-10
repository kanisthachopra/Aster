# Candidate feedback from a cropped push-up

Reviewed 2026-10-10. Status: independent evidence audit and proposed checks, not approved detector behavior. No private recording, frame, landmark, timestamped private finding or private path is included here. Local reproduction notes remain in ignored artifacts.

## The question to answer

Ask: **What useful thing can we support about the movement that is visible in this interval?** Do not start by requiring a complete body, but do not replace hidden anatomy with the exercise we expect to see. Head visibility is unnecessary for a visible hand/forearm observation. Shoulder visibility remains necessary for elbow angle, shoulder placement, or shoulder–hip coordination claims.

Keep three decisions separate: a person can recognize an episode in the pixels; a tracker can or cannot measure the relevant points; a technique reference can or cannot justify a suggested change. Success at one does not establish the others. Adding another downstream rule cannot recover a section where the upstream tracker produces no accepted landmarks.

## Inspected primary references

| Reference | Exact inspected content and supported use | Limits and reuse |
| --- | --- | --- |
| [American Council on Exercise: Bent Knee Push-up](https://www.acefitness.org/resources/everyone/exercise-library/13/bent-knee-push-up/) | Written steps 1–4. It describes support from the knees, trunk control while lowering/pressing, and extending the body from the knees. Short source excerpt: “without any bend at the hips.” Supports variation-specific setup education and a controlled movement cue. | Knees-down support is a documented variation, not itself a fault. The reference does not validate image thresholds, diagnose weak muscles, or prove that the user's hidden shoulder/hip line is correct. Copyrighted; link/paraphrase only. No reference images copied. |
| [ACE: Push-up](https://www.acefitness.org/resources/everyone/exercise-library/41/push-up/) | Written steps 2–5. Describes torso coordination and controlled lowering/pressing. It explicitly provides more than one hand/elbow configuration. | Does not support one universal elbow-flare angle. Full-body instructions require corresponding visible evidence before they become an observed correction. No muscle recruitment or pressure measurement from pixels. Copyrighted; link/paraphrase only. |
| [NASM: Push-Up](https://www.nasm.org/resource-center/exercise-library/push-up) | Setup, execution, return and beginner-modification sections. Lists knee and incline modifications and gives its own elbow/depth instructions. | Its approximately 45-degree elbow cue and avoid-lockout instruction differ from ACE's alternatives/full-extension wording. Do not turn either into a universal numerical fault rule. The page also contains a stray deadlift paragraph; it is not used. No source-video segment was reviewed. Copyrighted reference only. |
| [South Tees Hospitals NHS Foundation Trust: Combined press ups](https://www.southtees.nhs.uk/resources/combined-press-ups/) | Knee press-up subsection and its stated knee-supported pressing setup. Useful corroboration that knees-on-surface is an intentional exercise variation. | A clinical exercise handout does not prescribe this variation for every person or authorize treatment recommendations. Its illustrations are not an app training dataset. |

These organizations publish professional exercise education or clinical patient guidance. Their technique text is a rationale for a conditional cue, not independent ground truth for the application's detections. Nothing here adopts the references' physiological claims as something measurable from a recording.

## Candidates ranked by what their evidence really establishes

| Candidate | Minimum visible evidence | Permitted observation and one practical cue | Cannot conclude |
| --- | --- | --- | --- |
| **Steady hand during a moving episode** | Same identifiable hand/palm patch against a stable surface reference, visible continuously while another part of the arm/torso actually moves. A wrist point alone supports only wrist position. | “Your visible hand stays in the same place through this section. Keep that setup and make the next lowering deliberate.” Reason: preserve a repeatable setup while practising controlled movement. This is a strength plus a practice idea, not an invented correction. | Hand pressure, grip, wrist comfort, flatness of the entire palm, which muscles worked, or whole-body control. A camera-stationary wrist coordinate alone is not sufficient if the camera moves. |
| **Knee-supported variation context** | Knees and their surface contact region visible over multiple frames during the pressing episode, excluding initial setup/exit. Ideally ask the person which variation they intend. | “This section uses knee support. If that is the variation you want, we can review the parts visible here.” A separate practice card can explain coordinated torso movement from the knees. | Knees-down means failure, a completed repetition, or that shoulder–hip alignment is visible. Bent legs with cropped knees do not establish contact. |
| **Visible arm/forearm movement with a stable support** | Actual elbow/wrist tracking, or another independently validated local pixel correspondence, through the whole claimed interval. Preserve side identity and scene motion checks. | Describe the observed movement path. A controlled-movement practice suggestion may accompany it without declaring a specific faulty joint angle. | An elbow angle from two points, a complete press, chest depth, upper-arm rotation, or an anatomical lowering/raising phase from a projected segment alone. |
| **A visible pause or rhythm choice** | A moving section before and after the pause, stable scene reference, enough actual timestamps, and stationary visible body features beyond one momentary landmark stall. | “There is a pause in the visible movement here. Was that intentional?” If the user wants a continuous tempo, offer practising that chosen rhythm. Ask before treating a deliberate hold as an issue. | More elapsed time means slower movement, a pause is wrong, the torso bears weight on the surface, or it is a full-repetition endpoint. A clip freeze or dropped frames can look like a hold. |
| **Hips and knees only** | Direct hip/knee observation may describe a local path, with clothing/perspective uncertainty. | A neutral description can identify visible hip travel or support position. Full-body alignment may be offered only as general education, clearly unassessed in this view. | Whether hips lead the shoulders, whether the back sags, or whether the trunk stays straight. These require missing upper-body evidence. Do not ship a hips/knees-only whole-trunk correction. |

All candidates are proposals. Existing source-backed technique education can be useful without claiming it was discovered as an error in the current recording. The UI should label that distinction plainly.

## A simple falsification of a hips-only fault rule

Consider a knee-supported movement in a side projection with knee K fixed. Let hip H = K + L(cos θ, sin θ), and shoulder S = K + 2L(cos θ, sin θ). Changing θ changes hip height even though K, H and S remain collinear throughout. A hip moving up/down relative to the knees is therefore not, by itself, hip hiking or lost trunk coordination.

For the same observed K and H, a hidden shoulder can instead occupy another location S′. The visible inputs are identical while whole-trunk alignment differs. No threshold fitted to K/H can resolve that ambiguity. This is an identifiability limitation, not merely a missing training example. A silhouette-based torso estimator would be a different measurement and would require its own validation, including loose-clothing counterexamples.

## Human-buddy wording without fabricated certainty

Use this order: **where → what was visible → one thing to try → why → specific limit, only when relevant**. Attach the actual accepted interval to the video player. The following strings are templates, not statements about any evaluated recording:

- Strength plus practice: “At [verified interval], your near hand stays in place while you move. Keep that setup and lower deliberately on the next attempt, so you can repeat the movement from the same base. Your shoulder is outside this view, so I am not judging elbow angle.”
- Genuine observed change, only after validated evidence: “At [verified interval], your hand changes position partway through. If you were not deliberately resetting, settle your hand before the next attempt. That gives you a consistent starting position.”
- Intent question: “At [verified interval], the visible movement pauses before continuing. Was that a planned hold? I can compare your chosen tempo without treating the hold as a mistake.”
- Tracker failure despite useful pixels: “This view shows part of your movement, but I could not follow the elbow reliably enough to measure it. One practice idea for a knee push-up is to move the trunk together as you press. That is guidance to try, not a fault I measured in this clip.”

Do not prepend a confident “you did this wrong” merely to make advice sound personal. A conditional “if” cannot rescue an unsupported preceding observation. A useful buddy sometimes notices something done consistently or asks about intent rather than inventing a correction.

## Meaningful checks before any automatic candidate ships

1. **Pixel correspondence:** independently label the visible hand/elbow/knee region in permitted development clips. Check actual point placement and side identity, not only confidence counts. Review disagreements blindly; a point on clothing or the wrong person's arm is a failure even if confidence is high.
2. **Camera-motion falsifier:** fixed person plus moving camera must not become hand slip, support movement, or tempo. Test both uniform camera translation and perspective change; track static scene features separately from the body.
3. **Contact falsifier:** a knee just above a surface, a knee hidden behind the near leg, and a bent knee outside the image must not be labeled surface support. Static near-contact images require uncertainty.
4. **Variation falsifier:** deliberate hand reset, hands walking during a different exercise, knee-supported pressing, toe-supported pressing, incline support, intentional holds and rehabilitation variants must not receive the same default correction.
5. **Temporal falsifier:** reject a window crossing cuts, missing frames, duplicate frozen images, setup/exit, or tracking loss. A hold must not inflate moving-phase duration. Use the video's real timestamps and preserve them in the finding.
6. **Visibility falsifier:** mask shoulders in two videos sharing the same visible hip/knee path but differing hidden shoulder motion. The system must give the same limited observation and abstain from whole-trunk comparison. Do not impute shoulder positions from exercise identity.
7. **Value check:** qualified reviewers assess whether the one suggested action follows from the visible observation, fits the user's intended variation, and is understandable. Report unsupported suggestions separately from abstention. The current unlabelled corpus cannot yield a correction-accuracy percentage.

No new detector or executable geometry test is added by this audit. There is no justified automatic implementation to test until the required visual measurement is reliable. Writing a synthetic test that assumes the missing evidence would not close the actual-pixel gap. The next implementation candidate should target that gap explicitly, with the counterexamples above frozen before evaluation.
