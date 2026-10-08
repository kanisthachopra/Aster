# Aster — Outpost 07

A desktop-browser exercise park on a distant moon. Version **0.5** focuses on the movement review: actual tracked skeletons during processing and report-specific spoken feedback through an optional Deepgram connection. World production is paused while the core review and a 600-clip evaluation are developed. The complete cinematic product and persistent private accounts remain in development.

## Try it

Requires Node.js 24 and a desktop browser with WebGL2/hardware acceleration.

```powershell
npm --prefix frontend ci
npm --prefix frontend run dev -- --host 127.0.0.1 --port 5174
```

Open **http://127.0.0.1:5174** in Edge or Chrome for unrestricted FPS mouse capture.

1. Select **Begin expedition**. The silent title starts audio only on that interaction. The full opening lasts 12 seconds; skipping is optional.
2. Choose **New to this world**. Explore with WASD, Space to jump, click the world to capture the mouse, Escape to release. Arrow keys also turn. If an embedded browser blocks capture, hold and drag to look; there is no edge panning. Settings includes mouse sensitivity.
3. Find the dome using the terrain survey. Enter its southern airlock for the connected 29-second arrival: traveller enters, perspective returns to first person, lights start, ORBIT emerges and approaches. **Preview dome arrival** is a repeat-testing shortcut.
4. Give an optional callsign. ORBIT introduces reviews, missions, energy, recreation and settings. Choose one of three exercise stations and follow the blue floor markers. Press **E** near a station.
5. Choose a recording with one person, **2–120 seconds**, under 150 MB. A side or three-quarter view is helpful, but other views can provide observations too. Press **Analyze movement**. Watch the sampled recording and its actual tracked joints advance together. You can hide tracking or stop processing. Gaps are left unmeasured.
6. Read the findings and limitations—or listen to the report and individual observations when live voice is connected—then acknowledge them and **Finish review & return**. Only that final return records qualifying activity and awards daily energy. Partial observations can be saved to the journal without rewards. Leaving or cancelling earns nothing.
7. Open **Missions** for rules and progress, or **Journal** for the source recording, findings and Master Control deletion.
8. Visit a recreation console or select **Play** for Signal response, Echo sequence or Orbital alignment. These games do not award workout credits.

## What this build does

For live review narration, put `DEEPGRAM_API_KEY=your_key_here` in ignored `frontend/.env.local` and restart the local server. Do not put the key in chat or prefix it with `VITE_`. Only feedback text goes through the server to Deepgram; video inference remains local. See [voice setup](devpost/voice-setup.md). Static hosting alone does not provide this local speech endpoint.

The [evaluation repository](evaluation/README.md) keeps acquisition, source-group splits, actual inference and accuracy claims auditable. Exercise recognition, repetition estimates and correctness of form are separate tasks; an activity label does not establish safe or correct technique.

- Low 84m-wide geodesic glass dome inspired by the user's reference: triangular panes, warm frame, translucent exterior and clear outward views.
- Locally served CC0 scanned boulders and surface maps, physically based materials, geological skyline, lighting and post-processing. Solid boulders, poles and fixtures use collision with sliding and small movement substeps.
- Continuous opening/entry cameras; human facial features and articulated limbs; staged robot lift and approach. Characters are procedural and stylized, not photoreal assets.
- Direct relative mouse look with raw-input preference and a plain-pointer-lock compatibility retry. Drag-only fallback in capture-blocking windows.
- North-up terrain relief from actual world elevations; floor plan with numbered stations, entrance, scale and locked sectors.
- Real MediaPipe pose measurements in a background worker; pinned model/runtime served locally. No video leaves the computer and no API key is needed.
- Timestamped observed motion, visible-joint overlays and source links. No invented safe-form score, reference-video match or clinical diagnosis.
- Guest review completion, daily rewards, weekly resets, reserve cap and missed-day protection. The first five activity days award 5, 5, 5, 2.5 and 2.5 credits. All seven actual days without protection earn 2.5 reserve at rollover, capped at 100. Protection costs 10; at most three per week.
- Five-step robot orientation, journal with selective media/review removal, first-mission cue and sound/mouse/motion preferences.
- Rewritten conversational dialogue generated locally with Kokoro neural voices. The opening starts with speech; the former surf-like breathing loop is removed. Original temporary music/effects, subtitles and reading-time audio reduction remain.
- Three playable recreation games, keyboard controls, reduced-motion alternatives and focus restoration. All 14 official Emil Kowalski skills reviewed, with relevant browser guidance applied.

**Guest limitation:** callsign, video files, feedback and progress live in this tab's memory and clear on reload. Only sound, mouse and motion preferences persist. Account creation is deferred at the user's request. This is not a secure server reward ledger or durable private journal.

## Analysis evidence and limits

The Full model processed an independent public-domain seven-second Navy push-up clip: 28/28 measurable samples and one estimated visible cycle. The same clip cannot earn completion at incompatible stations. Additional private, locally inspected examples produced useful squat and pull-up reviews; a severely cropped push-up recording produced partial observations and specific tracking-gap guidance. No private media are shipped or uploaded, and no filename-specific behavior was added. Tests cover no-person footage, cancellation, projected-angle math, incomplete cycles, cropped joints and tracking gaps. These checks do not establish representative accuracy. Measurements are two-dimensional projections; they cannot establish safe range, pain, load suitability or hidden joint positions.

See [model provenance and fixture instructions](frontend/public/models/README.md). Test exercise media are ignored local artifacts, not shipped assets.

## Verify

```powershell
npm --prefix frontend run build
npm --prefix frontend test
```

The build typechecks and bundles production assets. Browser tests use installed Microsoft Edge; change the Playwright browser setting if unavailable. Tests reuse the running local server. Optional real-media checks require the documented fixtures; they skip when those files are absent. Screenshots and traces are ignored. See [0.4 verification](devpost/verification-0.4.md) and the [skills review](devpost/skills-review-0.4.md).

## Remaining product work

Persistent accounts/recovery/private storage; qualified exercise-feedback validation; licensed professional reference-video comparison; avatar replay driven by supported evidence; finished character models, composed score and final voice direction. Neural voices are synthetic, not recordings of human actors. These remain tracked in the [checklist](devpost/checklist.md), [PRD](devpost/prd.md), [technical plan](devpost/spec.md) and [sound brief](devpost/sound-design.md).

## Source map

- `frontend/src/game/World.ts`, `Park.ts`, `Characters.ts`: world, cinematics and characters.
- `frontend/src/game/MouseLook.ts`: captured relative input, drag fallback and release.
- `frontend/src/components/SurveyMap.tsx`: terrain survey and habitat floor plan.
- `frontend/src/analysis/`: frame sampling, measurements and report contracts.
- `frontend/src/components/ClipPreview.tsx`, `ReportVoice.tsx`: selection, live tracking, evidence, spoken review and completion.
- `frontend/server/speech.ts`, `frontend/src/speech/`: local Deepgram boundary, text chunking and cancellation.
- `evaluation/`: reproducible public-video acquisition, inference and task-specific evaluation.
- `frontend/src/game/journey.ts`: guest activity and energy rules.
- `frontend/src/components/RobotTour.tsx`, `Missions.tsx`, `Journal.tsx`: guided systems and records.
- `frontend/src/game/AudioDirector.ts`: adaptive temporary sound and local dialogue.

Scene assets combine original procedural work with attributed CC0 Poly Haven scans; provenance is bundled in `frontend/public/textures` and `frontend/public/models/boulder`. Dialogue provenance is in `frontend/public/audio/README.md`. MediaPipe license and model provenance are bundled alongside their assets. No film/game soundtrack or third-party character is bundled. No deployment has been performed.
