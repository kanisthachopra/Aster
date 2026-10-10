---
doc: checklist
status: approved
---

# Build Checklist

The learner approved the architecture and explicitly authorized starting implementation on 2026-10-07. This derived order preserves the full PRD. Build mode: implementation-led (fast pacing inferred from “you can start working”), with an early hands-on checkpoint and final review. They may change pacing at any time.

## Slices

2026-10-10 release update: account, recovery, private journal and transaction-based progression are implemented with Vercel/Supabase under the learner's revised hosting choice. Ten SQL tests, eleven API tests, six account-screen tests and 25 live Supabase checks pass. The exact migration is applied. Production settings, DNS and HTTPS are configured at `https://aster.kcmira.me`; 20 production checks passed, including actual Deepgram audio and private account recovery. The learner's complete public-site walkthrough and optional email-provider setup remain. The older Django implementation wording below is superseded for these services by `spec.md > Account and hosting revision`.

- [x] **1. Enter the world and reach an exercise station**
  Becomes usable: A playable desktop world with silent title, opening, exploration and discovery, dome arrival, robot, three stations, settings and a private local clip preview.
  Why now: Tests the browser's immersive experience and gives concrete visual feedback before committing to final asset production.
  PRD ref: `prd.md > Game Title Screen`, `Guided Arrival`, `Exercise Choice, Navigation, and Station Entry`, `Exercise Video Submission`
  Spec ref: `spec.md > First Playable Boundary`, `World and Scene Controller`, `Adaptive Audio and Character Speech`
  Build: Scaffold TypeScript/React/Vite/Babylon. Create original procedural environment and robot, input/state handling, original temporary sound cues, holographic review shell. Clearly mark unavailable accounts/analysis and earn no rewards.
  Verify (mechanical): Typechecked production build; browser route through title, opening, movement, all three station panels, cancellation and settings; unsupported clip and local preview checks; screenshot inspection.
  Learner check: Start the world, walk to the park, choose a station, and report how the scale, movement, lighting and panel feel relative to your vision.
  Commit: `Build playable space park and local exercise capture preview`

- [ ] **2. Submit a real clip and inspect measured evidence**
  Becomes usable: A real analysis pipeline, with usable/uncertain/unusable outcomes and timestamped movement observations.
  Why now: Proves the unique kernel before building rewards around it; no misleading success simulation.
  PRD ref: `prd.md > Analysis Display and Reference Comparison`, `Frame-specific Feedback`
  Spec ref: `spec.md > Analysis Worker and Evidence Gate`, `Validation Before Committing to the Analysis Design`
  Build: Select compatible Python environment, Django job service, private test uploads, pose pipeline, exercise criteria, real reference provenance and review UI. Resolve representative clips and model/provider decisions before private transfers. Benchmark against qualified human review.
  Verify (mechanical): Clear/occluded/invalid clips per exercise, source timestamps, cancellation, retry, unsupported-evidence rejection, real pose overlay alignment.
  Learner check: Review a consenting test clip and compare the actual marked moments with the robot's explanation.
  Commit: `Add measured video review with evidence and uncertainty`

- [ ] **3. Return securely to a private journey**
  Becomes usable: Robot-led account setup/sign-in/recovery, retained private journal and deletion.
  Why now: Adds durable user ownership to the proven review flow.
  PRD ref: `prd.md > Returning User and Account Access`, `Restore Authorization`, `Journal Master Control`
  Spec ref: `spec.md > Private Account and Journal Service`, `Data Model`, `API Contracts`
  Build: PostgreSQL, Django sessions, generated single-use recovery command, optional verified email, owner-scoped media and selective deletion; integrate all three exercises and onboarding photos as optional research input.
  Verify (mechanical): Cross-account access denied, recovery reuse/expiry, CSRF/session behavior, actual deletion and source-unavailable handling, persistence across restart.
  Learner check: Create an account, return, recover it, and delete a selected record without losing unrelated history.
  Commit: `Add private accounts recovery and retained journal`

- [ ] **4. Finish reviews and earn the agreed progress**
  Becomes usable: Exit-only daily completions, weekly tasks, regular/reserve credits, protection and journal-linked milestones.
  Why now: Rewards depend on real usable reviews and durable identity.
  PRD ref: `prd.md > Station Completion and Credit Update`, `Energy Credits and Streak Protection`
  Spec ref: `spec.md > Mission and Energy Ledger`, `Data Model`
  Build: Transactional ledger, local calendar boundaries, reset/reserve rules, manual protection, missions and first-exit celebration.
  Verify (mechanical): Duplicate exits, multiple clips/day, failed analysis, 5/6/7-day weeks, 100 reserve cap, weekly reset, three-protection cap and timezone edges.
  Learner check: Finish and exit a review, then inspect the exact mission/credit change.
  Commit: `Add verified station completion and energy progression`

- [ ] **5. Complete character, cinematic and sound production**
  Becomes usable: Finished first-person/body animation, original adaptive score, selected voices, supported avatar replay and reference library.
  Why now: Production follows tested scene timing, real review data and early visual feedback; these remain required features.
  PRD ref: `prd.md > Look and Feel`, `Music and Sound Direction`, `Avatar Feedback Demonstration`
  Spec ref: `spec.md > External Services and Production Gates`, `Adaptive Audio and Character Speech`
  Build: Integrate licensed/original final assets, voice/text synchronization, reconstructed versus illustrative motion labels, optional-photo validation, performance tuning and accessibility.
  Verify (mechanical): Full journey, audio state transitions, speech uncertainty, muted readability, reduced motion, source licensing and device performance.
  Learner check: Play the complete journey and judge the music, robot, avatar and exercise feedback together.
  Commit: `Complete cinematic audio and evidence-driven character experience`

## Hands-on Checkpoints

Current state (2026-10-07): The learner tried slice 1 and supplied extensive feedback. They approved the direction and typography while identifying broken mouse look, a short prescribed path, cramped park, primitive hands, missing dome/robot startup detail and insufficient sound. Exploration build 0.2 implements that revision. Production build and all five browser scenarios passed; checkpoint commit: `653754c`. See `verification-0.2.md`. Accounts, real analysis and reward flows remain explicitly unavailable.

The revised browser suite covers title silence; actual movement to all three station identities; cancellation; invalid-file and decoded local playback handling; sealed-sector boundaries; settings persistence; returning-user boundary; exploration and line-of-sight discovery without the bypass; arrival and callsign; native pointer capture; deliberately denied capture, no-button look, Escape and modal release. The in-app browser was also manually exercised: a look gesture changed the displayed heading from 000 to 018 degrees using fallback mode.

Repairs found during verification: Babylon prevents the default pointer event, suppressing compatibility mouse events. MouseLook now listens to pointerdown/pointermove. A DynamicTexture clone had no uploaded pixels, so textured terrain was invisible; generated normal pixels are uploaded explicitly and ring textures shared directly. Missing favicon requests and test text encoding were corrected. Screenshots verify landscape, exterior, third-person entry, interior sky and station UI. Final photorealistic assets, composed orchestral tracks, qualified motion validation and human sound review remain later production work.

- [x] Early playable world explored; learner feedback recorded and incorporated into this revision.
- [ ] Learner retries revised mouse look, exploration scale, dome entry and audio feel.
- [ ] Integrated real review explored after slice 2.
- [ ] Final kick-the-tires exploration and feedback completed.

## Final Review

- [ ] Feedback resolved and learner confirms ready to ship.

## Code Tour and App Map

- [ ] Follow one real action through world, review and server code.
- [ ] Optional edit/transfer reflection offered.
- [ ] Markdown app map generated (user's format preference overrides HTML default).

## Revisions

- The user explicitly authorized beginning work after approving the stack; no additional planning-permission loop. First world preview is an early slice, not a reduction of the approved product.
- Deep Babylon imports reduced the main production JavaScript chunk from approximately 6.98 MB to 1.31 MB uncompressed, retaining the same scene. A large-chunk advisory remains expected for this initial 3D entry point.
- A local sandbox loopback restriction prevented the first preview being reached. A local-only server outside that restriction now runs on port 5174; README and browser tests use that verified address. No deployment or public exposure occurred.
- Some WebM files omit finite duration metadata. The preview permits local playback with an explicit duration-unavailable message; later server submission must validate duration before analysis.

- Hands-on revision 0.2 replaces the original W-only obstacle route with free exploration and a corner map. It adds a much larger one-way-view dome, physical airlock, third-to-first-person reveal, delayed light activation, sealed rear sectors, service-bay robot startup, articulated hands, creatures, improved terrain/celestial graphics, title motion and temporary voiced audio. These changes are explicitly requested, not a scope reduction.

## October 8 checkpoint — movement lab 0.3

The current implementation adds the real browser-local evidence pipeline and connects it to a guest-only journal and progression flow. This advances slices 2 and 4 without marking their production criteria complete: representative human-reviewed accuracy validation, persistent identity, private durable storage and a transactional server ledger remain outstanding. Account creation is explicitly deferred by the learner.

Implemented: Analyze movement action; real sampled pose findings; usable/insufficient states; cancellation/retry; timestamps and measured overlays; finish-only activity; guest journal selective deletion; four-step robot tour; exact weekly/reserve/protection rules; direct FPS capture and drag fallback; clear terrain/floor-plan map; low geodesic glass dome; continuous arrival and staged robot startup; more conversational temporary dialogue.

Verification details and the design review are in verification-0.3.md. Earlier references to edge-turning and unavailable analysis describe historical build 0.2 and are superseded. Final characters and voices remain production work, and the user has not yet accepted this revision.

## Revision 0.4 checkpoint

User feedback on the 0.3 checkpoint exposed cropped-body detection failures, an overly restrictive one-minute limit, missing solid-object collision, synthetic-system-voice delivery and insufficient visual detail. The requested revision adds joint-level/partial evidence, longer clips, modern physically based environment surfaces, collision handling, neural prerecorded original dialogue, a dialogue-first opening, revised UI motion and playable recreation consoles. Private diagnostic media stay ignored and local. Mini-games do not earn exercise credits. Full skills inventory/applicability is recorded separately.

Implemented and checked: all three station identities, real video review and timestamp overlays, finish-only energy, journal media deletion, partial-review bookkeeping, actual rock/fixture collision, recreation console interaction, three mini-games, revised opening speech, keyboard/reduced-motion UI, settings and exploration through the terrain. Recording guides now use exercise-specific sketches and portrait previews keep the Analyze action visible. See verification-0.4.md for final checks, diagnostic evidence and limits; skills-review-0.4.md records all fourteen official skills and the scoped motion approval.

The user has not yet accepted this revision. The production criteria above remain open: general technique-coaching validation, realistic finished character assets, final score/performance direction, private persistent accounts, reference-video comparison and evidence-driven avatar replay. No private video is part of the source repository or shipped app.

## Revision 0.5 — core review and measured evaluation

The learner explicitly pauses world dynamics and typography work. Current priorities are actual tracked movement during analysis, findings read aloud with uncertainty, a server-only Deepgram key, and an evaluated corpus of exactly 200 independently sourced clips for each supported exercise (600 total). The requested 80% target must refer to a measured task and credible labels, not the pose model's visibility or a made-up form score. Repeated inference and rule revision are evaluation/calibration, not reinforcement learning.

- [x] Show sampled recording frames and their actual detected skeleton during processing; handle missing joints and cancellation without fabricating motion.
- [x] Derive spoken feedback from each report, including timestamped observations, suggestions and uncertainty; add transcript and playback controls.
- [x] Prepare an ignored server-only Deepgram key slot and local speech integration.
- [x] Verify real Deepgram synthesis after the learner supplies a key. A real 295-character request returned playable MP3; the learner chose to keep this voice for now. Browser playback verification is recorded separately.
- [x] Acquire, deduplicate and decode 200 pull-up, 200 push-up and 200 squat clips with provenance and source-group splits.
- [x] Run the app's actual inference pipeline on all 600; retain reproducible aggregate results and evaluation protocol. Completed 200 per exercise with zero unresolved failures, using matching actual-inference caches when resuming.
- [x] Evaluate and improve development-set failure modes; preserve separate calibration and held-out test sets. Shipped the frozen core refinement after its final audit; withheld the trained activity classifier when it missed the predeclared release criteria. See evaluation/results/summary.md.
- [ ] Demonstrate at least 80% form-feedback accuracy on independently judged form labels. Action labels alone cannot close this item.
- [ ] Learner tries the new tracking display and spoken feedback.

## Revision 0.6 — voice first, notes on demand

The learner reported failed voice playback, flat cutscene delivery and an overloaded review screen on 9 October 2026. This revision follows their requested design: short automatic spoken feedback, everyday wording, and an explicit button to access the notes. Every commit is pushed to the Aster repository, following their standing instruction.

- [x] Keep default review compact; place written feedback and technical measurements behind explicit controls.
- [x] Derive short practical speech from measured moments and one specific uncertainty, without inventing faults or changing inference.
- [x] Replace 17 traveller/ORBIT clips with new voice performances; align scene timing to their measured lengths.
- [x] Fix bounded audio activation, connection waits, preview endpoint and retry/Stop recovery.
- [x] Verify real provider output through the complete game and station flow, plus failure recovery and written access.
- [ ] Learner tries the new voices and compact screen; dramatic naturalness remains a listening judgment.

## Core coaching revision 0.9

- [x] Replace isolated angle narration with a practical cue, reason and bounded replay.
- [x] Distinguish observed movement from general practice guidance.
- [x] Add animated phone-placement/framing guidance for all three exercises, with reduced motion.
- [x] Ask optional goal, variation and discomfort; alter advice for pain/instability.
- [x] Add local follow-up questions, spoken explanations and readable saved notes.
- [x] Fix complete-rep pull-up lowering segmentation in multi-rep sets.
- [x] Integrate bounded, consent-based server-only Nebius explanation selection; verify actual provider behavior.
- [x] Audit all 600 cached clips for new cue coverage without inventing correction accuracy.
- [ ] Independently label fresh form recordings with qualified reviewers and evaluate useful-correction precision/coverage.
- [ ] Expand well-supported pull-up/squat coaching beyond the current narrow checks.

## Cropped-recording revision 0.10

- [x] Separate local limb evidence from whole-body capture status.
- [x] Test two-endpoint fallback and repeated projected paths without inferring hidden anatomy.
- [x] Prevent static holds from producing misleading tempo corrections.
- [x] Make supported strengths primary feedback with timestamped replay.
- [x] Create versioned movement understanding and source/update ledger.
- [x] Verify actual public/provider context and protect it with explicit preview/consent, authentication, injury bypass and budgets.
- [x] Compare fresh Full, IMAGE/padding and Heavy inference; retain unsuccessful cases and keep unsupported recovery out of production.
- [ ] Solve unreliable tracking in the severe private push-up crop and produce broader genuinely useful corrections on independently reviewed partial footage.
- [ ] Validate form observations with qualified labels before declaring an accuracy percentage or automatic shared learning.

## Guest spoken-feedback repair, 10 October 2026

The learner identified exercise-feedback voice failure while using the guest expedition. The hosted speech route correctly requires sign-in; the client hid its 401 behind a connection error and offered an ineffective retry. This repair adds a clear account action while preserving the current clip and report.

- [x] Preserve speech access errors and show the reason directly in the review.
- [x] Explain guest written analysis and account-only spoken feedback before analysis.
- [x] Keep the selected video and analyzed report mounted while account access opens; return to that review after sign-in or cancellation.
- [x] Verify guest access, rejected/cancelled sign-in, preserved clip/report and resumed automatic feedback in the real app with stubbed services; check actual hosted Deepgram generation separately.
- [ ] Verify the published guest-to-account review flow with actual Deepgram playback.
- [ ] Learner retries spoken feedback through the new account action.
