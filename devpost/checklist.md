---
doc: checklist
status: approved
---

# Build Checklist

The learner approved the architecture and explicitly authorized starting implementation on 2026-10-07. This derived order preserves the full PRD. Build mode: implementation-led (fast pacing inferred from “you can start working”), with an early hands-on checkpoint and final review. They may change pacing at any time.

## Slices

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
