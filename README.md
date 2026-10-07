# Aster — Outpost 07

A computer-browser exercise park set on a distant moon. **Aster** is a working name. The approved product includes real video feedback, private accounts and journals, progression, and a cinematic character/audio experience. This repository currently implements the **first playable world slice**, not the completed product.

## Try the current build

Requires Node.js 24 (the verified local version) and a desktop browser with hardware acceleration/WebGL2. From the project folder:

```powershell
npm --prefix frontend ci
npm --prefix frontend run dev -- --host 127.0.0.1 --port 5174
```

Open **http://127.0.0.1:5174**. Start is deliberately silent until you select **Begin expedition**. No API key, account or external service is required for this slice.

1. Watch or skip the opening, then choose **New to this world**.
2. Explore with **WASD** and optional **Space** jumping. Click the world once to start mouse look; **Escape** releases it. When the browser blocks capture, moving the mouse still looks around without holding a button, and the screen edges keep turning. Arrow keys also turn the view.
3. Use the corner survey map to find the initially concealed habitat. Its southern airlock starts a third-person arrival, first-person sky reveal, light activation and ORBIT service-bay startup. Give an optional callsign, then choose pull-ups, push-ups or squats and follow the interior blue markers.
4. At a station, press **E** or click its entry prompt. Read capture guidance and choose a local recording.
5. Leave the station or press **Escape** to return. Use Settings for music, effects, dialogue and reduced motion.

**Preview dome arrival** jumps to the arrival sequence for repeat testing. Returning-user access and Journal explain their current unavailable state without collecting credentials or inventing saved records.

## What works

- Mineral-textured terrain, weathered rocks, roaming six-legged creatures, crisp star points and a banded ringed planet.
- An 84-unit-diameter habitat with an opaque exterior, outward interior views, a sliding airlock, three spacious stations and sealed future sectors.
- Silent animated title, opening with articulated hands, exploration, third-person entry, first-person reveal, service-bay robot activation and voiced/subtitled greeting.
- Movement, jumping, mouse look, station proximity and floor guidance for all three exercises.
- Native modal holographic panel with keyboard focus handling, capture guidance and local video preview.
- File type/size/playability checks; known durations over 60 seconds rejected. Videos without finite duration metadata can be previewed, but length verification remains necessary before future analysis.
- In-memory files only: replacement/closing revokes the object URL. No workout footage is uploaded or saved.
- Original temporary layered music with reverb, breathing, footsteps, power and machinery cues, locally generated voice auditions, speech ducking and quiet reading intervals. Sound preferences persist locally.

## Still required

Real movement analysis and frame findings; evidence/reference-video comparison; Django/PostgreSQL accounts and private storage; recovery and deletion; actual reward ledger; rigged exercise/feedback animation; final original music and character voices. Optional reference-photo accuracy claims require evaluation. The temporary sounds and procedural character geometry are production scaffolding, not the finished cinematic assets.

The complete product remains tracked in [the build checklist](devpost/checklist.md), [PRD](devpost/prd.md), [technical plan](devpost/spec.md), and [sound brief](devpost/sound-design.md).

## Verify

```powershell
npm --prefix frontend run build
npm --prefix frontend test
```

The build performs strict TypeScript checks and bundles production assets. Five browser scenarios use installed Microsoft Edge and synthetic video data to cover title silence, all three stations, cancellation, invalid/playable files, sealed sectors, saved settings, returning-user boundaries, actual exploration and discovery, callsign personalization, native mouse capture and deliberately denied capture. Test screenshots and traces are ignored in Git. On a machine without Edge, select an installed Playwright-supported browser in `frontend/playwright.config.ts`.

If the development server is already running, the tests reuse it. A restricted execution environment may need local network permission to reach its own loopback server. No deployment has been performed.

## Source map

- `frontend/src/App.tsx`: journey states and contextual interface.
- `frontend/src/game/World.ts`: original 3D scene, camera, movement and station guidance.
- `frontend/src/game/MouseLook.ts`: capture, fallback, edge turning and release.
- `frontend/src/game/Environment.ts` and `terrain.ts`: landscape, sky and creatures.
- `frontend/src/game/Park.ts` and `Characters.ts`: dome, airlock, robot, avatar and hands.
- `frontend/src/components/SurveyMap.tsx`: position, heading and discovery map.
- `frontend/src/game/AudioDirector.ts`: temporary original sound sketch and live mix controls.
- `frontend/src/components/ClipPreview.tsx`: local-only video selection, validation and disposal.
- `frontend/src/components/Panel.tsx`: native accessible dialog boundary.
- `frontend/tests/journey.spec.ts`: reproducible browser checks.

## Assets and privacy

Current scene geometry, procedural textures and musical/effect cues are generated by project code. Temporary dialogue was synthesized locally using installed Windows voices; see `frontend/public/audio/README.md` for provenance and the final-voice production gate. No film/game soundtrack recording or third-party character asset is bundled. Dependencies have their own licenses. The ignored learner profile, local credentials, private recordings, generated artifacts and dependency directories must not be published. Only sound/motion preferences are stored in browser local storage in this build; the callsign lasts only for the current visit.
