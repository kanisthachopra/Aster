---
doc: spec
status: approved
---

# Exercise Form Feedback — Technical Specification

## Account and hosting revision, 2026-10-10

The learner requested Vercel deployment at `aster.kcmira.me` and their existing Supabase project. This replaces the earlier proposed Django account service for this release. React/Vite/Babylon and local MediaPipe analysis remain. One same-origin Vercel Node function handles Supabase Auth, owner-scoped PostgreSQL records, private Storage, recovery and live speech. The same handler runs locally through Vite.

Passwords and Auth tokens stay off the client JavaScript surface. HttpOnly cookies and a server session proof protect app access; recovery rotates its command and ends prior app sessions. Reports save without raw pose frames. Recording retention is a separate explicit choice. Database transactions handle idempotent completion, server-calendar dates, weekly awards and reserve protection. Browser-derived reports do not independently attest exercise technique or attendance. Email recovery is available only when its provider is configured and the address verified. Exact contracts and deployment variables are in `frontend/server/README.md` and `supabase/README.md`.

Disposable live integration checks passed for two-account isolation, sign-in, recovery and command reuse rejection, private small and resumable large uploads, playback, selective deletion and duplicate-safe awards. This does not replace the outstanding qualified form-feedback benchmark or final visual production work.

Architecture approved on 2026-10-07: the learner accepted the recommended stack and explicitly asked to begin implementation. The build supplement below derives implementation details from that approval. External providers, validated analysis, and final media remain dependency gates for their respective slices, not assumed completed decisions.

## How This Works, In Plain Language

The complete experience runs on a computer. The user moves through the space park with keyboard and mouse, provides an exercise-video file, inspects feedback through the holographic screen, and finishes the station to update daily activity and Energy Credits. Their authenticated journal preserves retained records for later visits. Music and character speech follow the scene and interaction sequence in the approved sound brief.

The learner chose computer-browser delivery with a silent game title screen as the start interaction. The approved architecture uses the browser for the world and a future private Django service for analysis and records, as detailed below.

Implements `prd.md > Supported Devices`, `The Core Journey`, and `Music and Sound Direction`.

## Where It Runs and How Someone Tries It

**Learner decision:** first release is computer-only with keyboard and mouse. Phone support, a mobile interface, and a connected phone-recording flow are future work. Users supply an exercise-video file available on the computer.

**Approved delivery:** run in a computer's web browser, making the game, file-upload controls, and holographic interface part of one web application. The learner accepted browser-first with a minimal silent game-style title screen; selecting Start activates audio. The approved frontend uses React/TypeScript, Vite and Babylon.js. Local startup is documented in README; initial verification uses installed Microsoft Edge. Public hosting remains to select.

The curriculum calls for a short demo video and public GitHub repository; deployment is optional. Exact local startup and any sharing/deployment choice will be recorded once the runtime and tools are agreed.

### Browser Versus Installed Desktop — Recommendation

The learner asked for an explained recommendation before choosing. Recommend a computer browser app for this product because it combines a focused 3D exercise park with file upload, forms, video comparison, account recovery, and a journal in one delivery model. Sharing a hosted version would require opening a link rather than an installer. The full approved game experience is retained; this does not select a flat dashboard or pre-rendered-only replacement.

Verified platform capabilities:
- [WebGL](https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API) supports hardware-accelerated interactive 3D in compatible browsers, subject to the device's graphics support.
- [Pointer Lock](https://developer.mozilla.org/en-US/docs/Web/API/Pointer_Lock_API) supports first-person mouse-look. Browser compatibility must be tested; do not promise identical behavior everywhere.
- [Web Audio](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API) supports audio processing and spatial audio. It can support scene-based mixing and transitions, but soundtrack quality depends on assets and design rather than delivery model.
- [Autoplay rules](https://developer.mozilla.org/en-US/docs/Web/Media/Guides/Autoplay) mean audible playback generally needs a user gesture. Approved adjustment: a minimal game title screen with a silent representative still or subtly animated background and a small left-aligned menu. Selecting Start initializes audio and begins the opening cinematic with breathing; the grand theme enters at its specified later moment. Start can request fullscreen; mouse capture belongs to interactive movement, not to navigating the title menu. Handle denied audio/fullscreen requests without trapping the user or granting progression. This does not add a marketing landing page.

A native game-engine desktop application is more attractive if the project requires graphics features beyond the chosen web renderer, substantial local computation, or deep operating-system access. It adds installers, platform-specific distribution/testing, and integration work for the account/video-review interface. An installed web wrapper is a different alternative: [Electron](https://www.electronjs.org/docs/latest/) embeds Chromium and Node.js. Wrapping the same graphics in an installer does not by itself establish higher rendering quality or performance.

Analysis accuracy and media privacy do not follow automatically from choosing browser or installed delivery. Model suitability, capture quality, validation, authentication, storage, and authorization still need explicit designs. Either delivery model could use server analysis or local processing, and neither is automatically an offline app.

Before relying on browser delivery for the full world, validate a representative moving scene with avatar/robot animation, translucent park materials, audio mixing, and the holographic panel on the intended computer. Avoid promising photorealistic AAA quality or a frame rate before measurement. Keep rendering, product records, analysis, and audio clearly separated so later delivery changes can reuse suitable parts; a later native-engine version may still require rebuilding scenes and animation.

Computer-browser delivery and the React/Vite/Babylon stack are approved. The browser recommendation is about fit to this product, not a universal claim that browser apps are faster or cheaper.

## Decisions and Open Issues

- **Decided:** computer-only first release; phones deferred. Preserve the approved full product and sound direction rather than reverting to the earlier short hackathon scope.
- **Decided:** browser-based delivery with a silent game-style title screen, left-side minimal menu, and Start interaction to activate audio and begin the cinematic. Still versus subtly animated background remains an asset/design refinement.
- **Decided quality/cost priority:** the learner asks for efficient implementation while preserving the important immersive experience, sound, useful analysis, and complete user journey. No fixed development spending ceiling is set. Do not reduce agreed requirements based on an assumed Codex budget. Avoid redundant processing, uncontrolled retries, or unnecessary services; choosing a paid service still requires concrete integration details, not invented credentials or account access.
- **Learner uncertainty discussed:** whether an installed application is needed for the desired immersion. Platform documentation confirms that interactive 3D, first-person mouse-look, and layered audio are available on the web. The relevant tradeoffs are renderer limits, hardware performance, start-gesture requirements, delivery, and local computation; a representative scene is the proposed performance check. The learner accepted the browser recommendation and proposed the game title screen to supply the start gesture.
- **Approved architecture:** TypeScript/React/Vite with Babylon.js for the browser, Python/Django for accounts and analysis orchestration, PostgreSQL for durable records, private file storage, and a background analysis worker. See sections below. Sound/voice production and deployment remain to finalize.
- **Existing learner uncertainty to investigate:** whether optional personal-reference photos improve feedback accuracy. The specification must define a measurable investigation rather than promise a benefit. Movement reconstruction and supported progress observations also require validation.
- Component contracts, data model, file structure and validation details are recorded in the approved build supplement; README contains verified local startup instructions.

## Recommended Tools and Their Roles

The learner approved this architecture on 2026-10-07; production providers and final assets remain to select. The main tradeoff is learning two languages and coordinating a browser application with a Python service. This division gives the immersive world and private analysis/records clear homes while retaining the full approved experience.

| Role | Recommendation and reason | Documentation |
| --- | --- | --- |
| Holographic interface and journal | TypeScript with React: typed data shared across the screens, video controls, mission views, and forms. Vite provides the local frontend development/build workflow. | [React](https://react.dev/), [Vite](https://vite.dev/guide/) |
| Real-time world | Babylon.js: first-person camera, imported character/world assets, physically based materials, skeletal animations, lighting, and audio support. Use WebGL2 as the tested baseline; consider WebGPU where supported after measuring rather than making it a first-release requirement. | [Babylon.js capabilities](https://www.babylonjs.com/specifications/) |
| Server and identity | Python with Django: use its established username/password and session mechanisms, with explicit ownership checks on every private record. Extend recovery for the generated command and optional verified email, while keeping credentials out of robot dialogue. Django does not supply the entire custom recovery experience automatically. | [Django authentication](https://docs.djangoproject.com/en/5.2/topics/auth/default/) |
| Saved records | PostgreSQL for account metadata, reviews, participation, and credit transactions. Media belongs in private file/object storage, not in a public asset directory or the account table. Database version and storage provider remain to choose. | Dependency and provider contracts to complete after agreement. |
| Movement tracking | Start with MediaPipe Pose Landmarker in a Python analysis worker; assess landmark coverage and reliability per exercise before treating it as adequate. It reports image landmarks and estimated world landmarks, not a validated clinical measurement system. | [Pose Landmarker Python guide](https://developers.google.com/edge/mediapipe/solutions/vision/pose_landmarker/python) |
| Explanations | Benchmark a video-capable model alongside measured observations and curated exercise references. Gemini's video API is a candidate because it accepts video and timestamp-focused questions, not a selected model or a proven exercise coach. Require structured findings and evidence checks; model IDs and contracts remain to specify. | [Video understanding](https://ai.google.dev/gemini-api/docs/video-understanding) |

## Proposed Components

### World and Scene Controller

Implements `prd.md > Guided Arrival`, `Exercise Choice, Navigation, and Station Entry`, `Avatar Feedback Demonstration`, and `Game Title Screen`. A scene controller governs title screen, arrival, robot encounter, park exploration, station animation, and cutscenes. The React interface opens over the Babylon canvas; menu interactions release mouse capture and pause movement. GLB world, robot, and rigged avatar assets require an explicit art/animation pipeline. Do not equate rendering primitive placeholders with completion of the intended visual experience.

### Adaptive Audio and Character Speech

Implements `prd.md > Music and Sound Direction` and sound-design.md. An audio controller follows scene and interaction events, with separate music, dialogue, and effect levels. Compose or source usable cues for the shared theme and variations; prepare static spoken dialogue once, then generate dynamic feedback speech from the approved text only when needed. Lower music around speech and preserve the required sparse/silent reading moments. Cache unchanged dialogue and audio assets instead of regenerating them per visit. Voice provider, chosen voices, production tools, media permissions, and synchronization details remain to specify. Browser-default speech is not assumed to meet the required character quality.

### Analysis Worker and Evidence Gate

Implements `prd.md > Exercise Video Submission`, `Analysis Display and Reference Comparison`, and `Frame-specific Feedback`. The proposed server accepts authenticated private uploads and records an analysis job. A separate worker validates/decodes the clip, obtains movement tracking with timestamps, checks what is visible, and produces observations against exercise-specific reference criteria. A video-capable model may explain or supplement those observations; unsupported or conflicting findings must remain uncertain. A general model's confident response is not sufficient evidence of correct analysis.

The browser can remain responsive and show actual processing progress while work runs separately. Persist jobs/results so revisiting the panel does not rerun an unchanged completed analysis. Explicit reanalysis after model/reference changes creates a versioned review; deleting a source invalidates future use. Worker technology and restart/retry behavior remain to choose.

### Private Account and Journal Service

Implements `prd.md > Returning User and Account Access`, `Restore Authorization`, and `Journal Master Control`. Keep photos, videos, results, and saved records scoped to the authenticated owner. Save media privately, authorize playback, and implement actual deletion of selected content and dependent analysis artifacts according to a documented policy. Establish the optional email before recovery use. Store only protected verification representations of passwords/recovery secrets; AI inputs receive neither. Account recovery restores retained records but cannot recreate deleted ones.

### Mission and Energy Ledger

Implements `prd.md > Station Completion and Credit Update` and `Energy Credits and Streak Protection`. The server verifies review ownership and usable status, then commits the qualifying exit, daily participation, and credit award in a database transaction. A unique completion/day identity prevents repeated exit requests or reopening a review from earning again. Use exact quarter/half-credit-compatible units rather than binary floating-point balances. Keep regular and reserve balances separately; reserve qualification requires seven actual days and no regular-credit protection spend. Persist the award/spend history and perform weekly rollover once without granting free credits. Neither a browser animation nor an AI reply determines credit awards.

## Validation Before Committing to the Analysis Design

- **World and audio:** benchmark a representative park scene on the intended computer with avatar/robot motion, translucent materials, sound transitions, video playback, and the overlay. Use the results to improve assets and rendering, preserving the agreed cinematic direction. Hardware details and measurable performance targets remain to record.
- **Three exercise types:** evaluate representative consenting/licensed clips of pull-ups, push-ups, and squats, with clear, occluded, and unsuitable camera views. Check landmark tracking, event timestamps, and findings against competent human review. Define thresholds from evidence rather than claim an accuracy percentage before validation. If the first pose model is inadequate, investigate a better tracking approach instead of disguising failure.
- **Optional photos:** compare the same clips with and without the proposed reference photos to see whether they materially improve specific measurements/findings. Do not use them merely to decorate the scanning screen.
- **Avatar reconstruction:** validate joint mapping, coordinate conversion, smoothing, and capture uncertainty. Separate reconstructed observations from illustrative suggested motion; do not present unobserved movement as exact captured behavior.
- **Records and progression:** test ownership/recovery/deletion and transaction behavior, including duplicate completion, timezone/week rollover, insufficient credits, reserve caps, failed review, and non-rewarding cancellation.

## Efficient Operation Without Reducing the Product

Use scene-specific asset loading, reusable animation/audio assets, cached reviewed results, and one qualifying credit transaction per day. During analysis, process the necessary frames at a sampling density adequate for the movement rather than sending redundant copies of a full recording to multiple services. Avoid rerunning tracking just to change spoken phrasing. Record service latency and cost per usable review so the learner can adjust operational choices using evidence. These are engineering efficiencies, not permission to replace live movement feedback with simulated results.

## Historical Planning Handoff

Review the recommended two-language/browser-and-server architecture. Then establish whether third-party video/voice services are acceptable for real user media, choose the deployment/testing computer and production providers, and complete versions, API contracts, data schema, file structure, startup instructions, media production tasks, and validation targets. No external purchase, deployment, or private upload occurs during this planning step.

## Approved Build Supplement

This supplement supersedes the earlier recommendation/pending-agreement wording above. React, TypeScript, Vite, Babylon.js, Python/Django, PostgreSQL, private media storage, and a separate analysis worker are approved. Provider-specific decisions remain open. Start with the playable world and submission surface; do not silently replace Django/PostgreSQL with browser storage or invent successful analysis.

### The Core Journey Through the System

The silent title renders the same live world used during play. Start unlocks sound and runs the opening camera sequence. The entry choice leads to landscape exploration or account access. The robot introduces the park, then selecting an exercise changes the floor route. Approaching a station and pressing E starts its transition and opens the review overlay. A local video can be inspected before it is submitted. The later authenticated server stores an owner-scoped upload, queues real analysis, and returns versioned frame findings. Finishing a usable review and exiting sends an idempotent completion transaction. Journal and missions read server records. No world animation writes reward balances directly.

### Look and Feel

Proposed working identity: **Aster / Outpost 07**, clearly changeable. Charcoal space, warm grey moon rock, desaturated blue metal, pale cyan guidance, restrained amber for the distant sun. Spacious left-aligned title typography; compact monospaced instrument labels. Bespoke procedural terrain, orbital planet, architecture, stations, and robot supply an original runnable scene while final rigged characters and cinematic assets are produced. Procedural assets are a first art pass, not a claim of finished realism. Native HTML controls remain keyboard accessible over the canvas. Interface fades use 180–240 ms opacity/transform transitions, with reduced-motion support. Cinematic pacing is independent of those brief interface transitions.

### First Playable Boundary

The early visual checkpoint includes silent title, deliberate audio start, opening sequence, WASD/mouse exploration, optional jumping, corner map, concealed habitat discovery, arrival, robot greeting, three navigable exercise stations, locked stations, and a local video preview with exercise-specific capture instructions. It is labeled a development preview. Accounts, real analysis, rewards, and reconstructed movement are unavailable until implemented; there is no pretend sign-in, fake pose overlay, invented finding, or synthetic credit award.

### Data Model

Frontend: ScenePhase (title/opening/entry/guided/arrival/park/station), selected ExerciseId, active overlay, navigation target, settings, and in-memory selected file/object URL. Only non-sensitive sound/motion preferences persist locally. Close/replacement revokes object URLs; files are never persisted by this first slice.

Planned server: User with profile/timezone; hashed RecoveryCredential; verified EmailAddress; owner-scoped MediaAsset with private storage key/type/deletion state; AnalysisJob with exercise/status/version/input asset and failure reason; Review with timestamped findings, sources, tracking coverage, uncertainty and readiness; ReviewAcknowledgement; StationCompletion; unique DailyActivity(user, local_date); WeeklyEnergy and immutable EnergyTransaction; versioned ExerciseReference. Store credits in half-credit integer units (5 = 10 units; 2.5 = 5 units; protection = 20 units). Reserve cap = 200 units. Week/day and completion constraints are enforced in PostgreSQL transactions. Source deletion cancels queued work and removes derived tracking; surviving reviews visibly identify missing source media.

### API Contracts

Planned same-origin Django endpoints use session cookies and CSRF protection. GET /api/session returns signed-in user or anonymous. POST /api/auth/register, /login, /logout, /recover-command and /recover-email follow the approved recovery requirements; exact validation and email-provider contract are finalized in the identity slice. POST /api/media accepts multipart exercise/video after authentication and size/type/duration validation, returns asset id. POST /api/reviews accepts asset id and exercise and returns job id/status. GET /api/reviews/:id returns status and, only when ready, findings with start/end seconds, observation, suggestion, uncertainty and source IDs. POST /api/reviews/:id/finish records review acknowledgement. POST /api/station-exits accepts review id and idempotency key, atomically returns committed completion and balances or an explicit eligibility error. GET /api/journal, /missions and DELETE /api/media/:id are owner-scoped. These endpoints are planned, not present in slice 1.

### File Structure

```text
frontend/
  src/
    main.tsx             React entry point
    App.tsx              journey and contextual overlays
    styles.css           world HUD and holographic design tokens
    game/World.ts        Babylon scene, movement and station geometry
    game/AudioDirector.ts original temporary sound cues and scene mixing
    game/types.ts        scene and exercise contracts
    components/          settings, local clip preview, reusable panels
  tests/                 browser journey and input verification
backend/                 later Django identity/media/review/ledger service
  apps/                  accounts, media, analysis, journal, progression
  worker/                video decoding, pose estimation, evidence checks
assets/                  later licensed/source media manifest
devpost/                 approved plans, progress and production needs
README.md                current working startup and honest feature status
```

### Local Startup and Recording

First playable: Node 24 is available. From project root run `npm --prefix frontend ci`, then `npm --prefix frontend run dev -- --host 127.0.0.1 --port 5174`. Open http://127.0.0.1:5174 in a desktop browser with WebGL2. `npm --prefix frontend run build` typechecks and creates the production bundle. `npm --prefix frontend test` runs the three browser scenarios in installed Microsoft Edge. Record this preview only as development progress, not as a completed analysis demo. Django/PostgreSQL startup will be added when those actual services exist; Python 3.14 is installed but pose package compatibility must be checked before selecting the analysis runtime. Docker, ffmpeg and PostgreSQL commands were not found on PATH in the initial environment check. A one-time FFmpeg fixture generator is now under ignored .tools, and the retained original synthetic MP4 needs no generator at test runtime.

### External Services and Production Gates

Slice 1 uses no external account, API key or media transfer. Dependencies install from npm and exact versions are recorded in the lockfile. Production media requirements: original/appropriately licensed score stems, selected character voices, rigged protagonist with first-person animations, and approved attributed exercise reference clips. Local temporary synthesis validates event timing only; it does not fulfill the final soundtrack brief. Choose cloud analysis/voice providers and their retention/cost terms before transmitting real user media. Gemini remains a candidate, not an integration. Private object storage provider and hosting remain unselected. PostgreSQL documentation: https://www.postgresql.org/docs/ . MediaPipe, Django, Babylon, React and Vite documentation are linked above.

### Failure Modes and Verification

No WebGL: readable fallback with retry; no blank screen. Pointer capture denied: clicking the world activates mouse look without holding the button; edge turning permits continuous horizontal rotation. Escape/blur/panels release it. Listen for capture change/error events and handle promise rejection as well as older void-returning implementations. Blur/Escape releases movement keys so the avatar cannot drift. Closing overlays leaves pointer unlocked until deliberate recapture. Sound preferences apply to active nodes and persist independently of identity. Unsupported or broken clips produce readable errors, revoke URLs and never earn credits. Analysis unavailable is explicit; no fabricated results. Verify title silence, opening/skip continuity, guided controls and arrival, station selection/proximity/E, cancellation, settings, responsive desktop layout, clip replacement/cleanup, and typechecked production output. Measure render performance on the available browser without extrapolating to every laptop.

### Authorization and Build Pacing

The learner explicitly approved the recommended architecture and said to start working, after a long product interview. That authorizes implementing the derived order without another ceremonial approval question. Use implementation-led pacing with concise explanations and an early hands-on world checkpoint. Preserve the full product boundary; subsequent slices remain required. User feedback at the early checkpoint should shape the world before final asset production.


## Exploration Build Revision (2026-10-07)

User feedback explicitly replaces the short route and obstacles. The world now separates terrain, environment, characters, park and input into modules. A 370-by-335-unit explorable boundary surrounds an 84-unit-diameter habitat. Line-of-sight terrain checks gate discovery. The map displays sampled player position and heading; a manual preview-arrival shortcut supports repeat testing.

The dome uses an opaque exterior and lightly transparent inward-facing shell. Its entry sequence animates a suited third-person avatar, returns the camera to first-person, powers floor and station lights, opens service-bay shutters, activates ORBIT and moves it toward the visitor. Rear-sector movement bounds prevent access to unavailable equipment. Human-style hands include separate thumbs, finger joints, knuckles and nails; these procedural models remain replaceable by final art assets.

MouseLook owns pointer capture and fallback behavior independently of movement. Settings and all dialogs pause movement and release capture. Scene transitions reset held keys. Text entrance motion respects reduced motion. Arrival beats drive both subtitles and the AudioDirector, which plays locally generated temporary dialogue, sound effects and an original evolving motif with quiet reading intervals. Voice, effects and music have separate controls.

A clean page reload is required after changing scene constructor contracts during development; hot reload alone can retain an obsolete World instance. DynamicTexture clones do not copy/upload pixel content in the installed engine version. Procedural normal textures are generated and uploaded explicitly; shared ring textures are assigned directly. This correction preserves the intended art direction.

Input repair evidence: Babylon prevents the default pointerdown, which suppresses compatibility mousedown delivery. Listen to pointerdown/pointermove directly. A focused browser check must prove the heading changes after pointer movement; successful control labels alone are insufficient.

## Revision 0.3 — local evidence bridge (October 8)

To deliver usable analysis while account creation is explicitly deferred, the first evidence pipeline runs inside the browser. React calls analyzeVideo; a classic worker loads pinned MediaPipe 0.10.32 and the official Pose Landmarker Lite v1 model from same-origin public assets. The main thread decodes bounded samples and transfers image bitmaps; cancellation terminates the worker and releases media URLs. A worker prevents CPU inference from blocking interface input. No workout media are transmitted.

Reports contain sampled timestamps, visible landmarks, aspect-correct projected measurements, coverage, complete motion-cycle estimates, findings, limitations and source links. Coverage is not accuracy. UI playback hides pose overlays when playing or seeking to an unmeasured instant. Positive-path validation currently covers one real public-domain push-up clip; positive squat/pull-up evaluation remains open.

journey.ts implements a pure in-memory guest ledger. Analysis alone does not mutate activity. Finish review commits one daily award; duplicate report IDs are idempotent, and extra reports on the same local calendar day add journal entries without extra credit. Weekly energy resets Monday; seven actual activity days without protection earn 2.5 reserve, capped at 100; protection costs 10 and is limited to three per week. These guest rules are not a substitute for the planned transactional authenticated backend.

The existing Django/PostgreSQL plan remains the later durable service boundary. Current account UI collects no pretend credentials. A source File is retained only in the guest journal until removed, page reload or tab closure. Preferences alone use localStorage.

## Implemented revision 0.4 — October 8, 2026

This section supersedes the earlier Lite-model, 60-second, full-body-filter and four-step-tour descriptions. The browser still uses React/TypeScript/Babylon with no private-video network service.

- MediaPipe Full float16 v1 runs in the existing worker in VIDEO mode. Sample up to four frames/second, maximum 360, for 2–120 second clips. Measure each visible three-joint chain independently; absent measurements remain null. Stable-side selection, robust angle excursions and tracking-gap checks limit spurious cycles. Pull-up cycle estimates also check anchored hands and shoulder travel. This remains a heuristic observation system, not a validated technique classifier.
- Reports have usable, partial and insufficient states. Partial reports can retain evidence in the guest journal, but never increment activity or credits. Timestamps, coverage and recording guidance distinguish missing tracking from visible movement. Full model provenance, thresholds and limits are in frontend/public/models/README.md.
- CollisionWorld indexes upright circle/rotated-box obstacles spatially and resolves capsule movement with substeps and sliding. Exterior rocks and indoor fixtures share the controller. Rendered scanned boulders use a simplified collision envelope, not per-triangle rigid-body physics.
- Scanned CC0 terrain textures and boulders are hosted locally. Babylon uses PBR materials, original environment lighting, ACES tonemapping, restrained bloom and FXAA. Title readiness waits for scene/assets with a bounded fallback for optional art. The exercise review keeps the 3D background frozen to reserve resources for inference.
- Canonical dialogue text lives in src/game/dialogue.json; captions and onboarding read it directly. Seventeen prerecorded WAV files were generated locally with Kokoro neural voices and normalized to a consistent level. Runtime playback needs no voice service. The opening starts with speech, waits before music, and cancels speech when skipped. These are synthetic voices and temporary score/effects, pending final direction.
- Signal, memory and timing consoles open real mini-games via world proximity/E or the Play menu. Games are independent of the exercise ledger. Timers/animations clean up on exit; keyboard controls and reduced-motion alternatives are tested.
- All fourteen official Emil Kowalski skills were inspected at a recorded commit. Relevant CSS/WAAPI, interaction, focus and typography guidance is applied; no Expo or Swift runtime was introduced. See skills-review-0.4.md for applicability and the animation review.

No private test footage, contact sheets, generated landmarks or reports are shipped. The checked-in tests use independently sourced public fixtures where available and separate mathematical/input/ledger tests. Private examples are diagnostic, not hard-coded references or a general accuracy benchmark.

## Revision 0.5 — live evidence and speech boundary

The core review is now the active workstream; world/typography production is paused at the learner's request. The analysis function optionally copies one bitmap before transferring the inference image to the worker. Once that exact frame is measured, a synchronous callback paints its image and visible skeleton to a canvas, then releases the bitmap. Headless evaluation omits the callback/copy. No pose interpolation fills uncertain gaps. Users can hide movement tracking; progress and cancellation remain available.

Narration is assembled deterministically from the completed report's observations, timestamps, suggestions and limitations. It does not use a second language model to invent corrections. The review provides automatic reading when connected, specific-finding playback, stop/replay and a transcript. The existing music/dialogue controls still apply. Long readings are divided at sentence boundaries for the speech provider; cancellation covers both requests and playback.

Deepgram credentials live only in ignored frontend/.env.local, without a VITE_ prefix. A local, same-origin Vite server endpoint validates and proxies bounded feedback text to Deepgram; video/landmarks are never sent. This is a local development integration, not an authenticated public production backend. Source examples and setup instructions contain no credential. See voice-setup.md for configuration and production limits.

The benchmark target is 600 clips with 200 per action, source identifiers, hashes and grouped development/calibration/test splits. Activity recognition, visible measurement coverage, cycle estimates and form-correction accuracy are separate outcomes. Public action-only labels cannot validate good/bad technique, and the 80% form target remains open until an independently labeled form test supports it. Corpus media and raw inference results remain ignored local research artifacts; reproducible code, provenance metadata and aggregate results may be versioned.

The 600-clip run is complete. The shipped `revised3` rules keep orientation consistent with the chosen visible side, admit overhead-arm squats when temporal support evidence is present, preserve partial observations when grounding is uncertain, and withhold completed-set claims across abrupt tracking jumps. They passed the frozen held-out go/no-go check. The statistical activity classifier did not pass release criteria and is not used by the app. Evaluation snapshots, trained research weights, selection decisions and confidence intervals remain under evaluation/; none is presented as a personal form-correctness score.

## Revision 0.6 — brief spoken review and voice recovery

A pure coaching presentation layer selects up to two measured movement moments and one relevant capture limitation. It translates those observations into everyday language without changing the report, measurements, model or release decisions. Default speech avoids angle values and repeats no full technical report. Written coaching, exact original evidence, measurements and source links remain accessible through the written-feedback button and a nested native disclosure.

Analyze activates browser audio during its user gesture. Audio activation, configuration and provider requests have deadlines; interrupted audio returns a recoverable state. Retry remains available after errors. A generation guard prevents an initial connection check from starting speech after Stop. The same protected endpoint is mounted for local development and local production preview. A bounded rolling 24-hour character budget replaces permanent preview-run exhaustion; cached replays can still be served when generation budget is exhausted.

All 17 cinematic/guide files are replaced with original scripted Deepgram Aura 2 recordings: Apollo for the traveller and Thalia for ORBIT. The fixed-script generation tool caches unchanged requests, normalizes audio, and records hashes and durations. Runtime cinematic playback uses local files with a revised cache URL. The arrival lasts 30.1 seconds, leaving room after the lights and greeting dialogue. See verification-0.6.md and voice-setup.md for actual full-app playback evidence.
