# Aster — Outpost 07

A desktop-browser exercise park on a distant moon. Version **0.3** connects the explorable world to real local motion analysis, robot orientation, a guest journal and Energy Credits. The complete cinematic product and persistent private accounts remain in development.

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
4. Give an optional callsign. ORBIT introduces reviews, missions, energy and settings. Choose one of three stations and follow the blue floor markers. Press **E** near a station.
5. Choose a steady side-view recording with one person and a full movement, **2–60 seconds**, under 150 MB. Press **Analyze movement**. Local MediaPipe inference produces measured observations, timestamp buttons and actual pose landmarks, or explains why the footage is insufficient.
6. Read the findings and limitations, acknowledge them, then **Finish review & return**. Only that final return records activity and awards the daily energy. Leaving or cancelling earns nothing.
7. Open **Missions** for rules and progress, or **Journal** for the source recording, findings and Master Control deletion.

## What this build does

- Low 84m-wide geodesic glass dome inspired by the user's reference: triangular panes, warm frame, translucent exterior and clear outward views.
- Continuous opening/entry cameras; human facial features and articulated limbs; staged robot lift and approach. Characters are procedural and stylized, not photoreal assets.
- Direct relative mouse look with raw-input preference and a plain-pointer-lock compatibility retry. Drag-only fallback in capture-blocking windows.
- North-up terrain relief from actual world elevations; floor plan with numbered stations, entrance, scale and locked sectors.
- Real MediaPipe pose measurements in a background worker; pinned model/runtime served locally. No video leaves the computer and no API key is needed.
- Timestamped observed motion, visible-joint overlays and source links. No invented safe-form score, reference-video match or clinical diagnosis.
- Guest review completion, daily rewards, weekly resets, reserve cap and missed-day protection. The first five activity days award 5, 5, 5, 2.5 and 2.5 credits. All seven actual days without protection earn 2.5 reserve at rollover, capped at 100. Protection costs 10; at most three per week.
- Four-step robot orientation, journal with selective media/review removal, first-mission cue and sound/mouse/motion preferences.
- Original temporary music/effects, local synthesized dialogue auditions, subtitles and reading-time audio reduction.

**Guest limitation:** callsign, video files, feedback and progress live in this tab's memory and clear on reload. Only sound, mouse and motion preferences persist. Account creation is deferred at the user's request. This is not a secure server reward ledger or durable private journal.

## Analysis evidence and limits

The real model processed a public-domain seven-second Navy push-up clip: 26/28 usable samples and two estimated movement cycles. It rejected the same clip at incompatible squat and pull-up stations. Tests also cover no-person footage, cancellation, pose initialization, projected-angle math, incomplete cycles and tracking gaps. Positive real squat/pull-up validation and a representative accuracy evaluation remain outstanding. Measurements are two-dimensional projections; they cannot establish safe range, pain, load suitability or hidden joint positions.

See [model provenance and fixture instructions](frontend/public/models/README.md). Test exercise media are ignored local artifacts, not shipped assets.

## Verify

```powershell
npm --prefix frontend run build
npm --prefix frontend test
```

The build typechecks and bundles production assets. Browser tests use installed Microsoft Edge; change the Playwright browser setting if unavailable. Tests reuse the running local server. Optional real-media checks require the documented fixtures; they skip when those files are absent. Screenshots and traces are ignored. See [0.3 verification](devpost/verification-0.3.md) for this machine's results.

## Remaining product work

Persistent accounts/recovery/private storage; qualified exercise-feedback validation; licensed professional reference-video comparison; avatar replay driven by supported evidence; finished character models, original score and human-quality voices. These remain tracked in the [checklist](devpost/checklist.md), [PRD](devpost/prd.md), [technical plan](devpost/spec.md) and [sound brief](devpost/sound-design.md).

## Source map

- `frontend/src/game/World.ts`, `Park.ts`, `Characters.ts`: world, cinematics and characters.
- `frontend/src/game/MouseLook.ts`: captured relative input, drag fallback and release.
- `frontend/src/components/SurveyMap.tsx`: terrain survey and habitat floor plan.
- `frontend/src/analysis/`: frame sampling, measurements and report contracts.
- `frontend/src/components/ClipPreview.tsx`: selection, analysis, evidence and completion.
- `frontend/src/game/journey.ts`: guest activity and energy rules.
- `frontend/src/components/RobotTour.tsx`, `Missions.tsx`, `Journal.tsx`: guided systems and records.
- `frontend/src/game/AudioDirector.ts`: adaptive temporary sound and local dialogue.

Scene geometry, textures and musical/effect cues are generated by project code. Dialogue provenance is in `frontend/public/audio/README.md`. MediaPipe license and model provenance are bundled alongside their assets. No film/game soundtrack or third-party character is bundled. No deployment has been performed.
