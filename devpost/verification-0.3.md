# Verification — Aster 0.3

Date: 2026-10-08. Desktop Edge, Windows, local development server port 5174.

## Implemented behavior

Actual local pose analysis replaces the inert upload preview. The review exposes Analyze movement, progress, cancellation, usable/insufficient outcomes, timestamped observed measurements and actual sampled landmarks. Finish review requires acknowledgement and a usable result, then updates the guest journal and daily credit. ORBIT's four-step orientation introduces these systems and settings.

The environment now uses a low geodesic glass dome, connected entry camera and staged robot startup. Mouse capture is immediate relative movement, with an explicit drag fallback where capture is denied. The map uses actual terrain relief and a labeled floor plan.

## Evidence

- Final production TypeScript/bundle check: passed after all source changes. Main entry is approximately 1.42 MB (368 KB gzip); Vite retains its large-chunk advisory for the 3D entry.
- Analysis suite: 9 passed. Real model on public-domain Navy push-up segment: 26 of 28 usable samples, two movement cycles; same clip rejected at incompatible stations. Also covers real no-person footage, initialization, cancellation, same-origin-only requests and deterministic measurement rules.
- Input suite: four focused checks passed for native capture, denied capture with drag/no edge turning, unsupported raw input retry and cancellation of late capture.
- Guest ledger suite: four passed. Usable-only completion, idempotency, one reward per day, 5/5/5/2.5/2.5 distribution, weekly reset, seven-day reserve rule, cap, protection spending/limit and missed-day streak behavior.
- Integrated suite: all 21 tests passed in 5.5 minutes, with no optional-fixture skips. This includes four full journey scenarios, nine analysis checks, four input checks and four ledger checks. After the final station-render optimization, both affected journey scenarios passed again. The real seven-second clip processed in 5.2 seconds inside the full app, down from 47.7 seconds with the 3D scene running at 12 fps. Negative footage, return-to-park movement, evidence overlay alignment, acknowledgement gating, five-credit completion, missions and selective journal deletion all passed. This is a local-machine measurement, not a cross-device benchmark.
- Screenshots: `frontend/artifacts/` (ignored). Visual inspection covers dome geometry, interior sky, avatar, ORBIT, map and analysis results.

## Emil Kowalski design review

Applied the installed emil-design-eng skill and checked the author's official skills repository: https://github.com/emilkowalski/skills. Motion should explain state and respond promptly; routine controls should not add animation delay. This informed the changes below.

| Before | After | Why |
| --- | --- | --- |
| Edge-driven fallback camera turning | Captured relative FPS motion; denied capture uses explicit drag | Camera responds to intentional hand movement, with no edge dwell or decorative smoothing. |
| Unclear upload endpoint | Four visible review steps, explicit Analyze action and distinct Finish action | Makes the core task and the moment of completion understandable. |
| Decorative analysis expectations | Actual sampled evidence and determinate frame progress | Motion and progress communicate real work. |
| Guesswork about missions/settings | Short robot-led orientation, replayable on request | Explains the product where it becomes relevant. |
| Ambiguous map curves | Terrain shading, north, scale, entry and labeled stations | Navigation reflects the real scene. |
| Camera cuts and early reduced-motion skip | Continuous movement with full-length, gentler introduction | Preserves narrative meaning while reducing movement. |
| Generic click response | Brief, property-specific button feedback and visible focus | Interaction responds without distracting from reading or aiming. |

React review: extracted tour/journal/mission components, stable speech callback, worker-only model loading, object URL cleanup, abort on unmount/replacement, native modal focus, visible labels and reduced-motion handling. Manual seeking hides landmarks unless they correspond to a sampled frame. Completed results scroll into view; timestamp actions reveal the evidence player. Reduced motion removes smooth scrolling. Behind other reading panels, the world renders at 12 fps and stops emitting unchanged map coordinates. At an exercise station, the 3D background freezes after one frame while audio and the video/review interface continue; resize and returning to the park invalidate that frame. This leaves resources for local inference.

## Remaining limits

The positive model example covers one push-up video, not general accuracy; positive real squat and pull-up testing remains open. Joint angles are camera projections, not safe-range prescriptions. Reference-video comparison and avatar reconstruction are not implemented. Guest records clear on reload; accounts, durable storage and server-enforced rewards remain later work. Avatar geometry is still stylized, and voice files remain synthesized auditions. No medical or photorealistic production claim is made.

The existing in-app browser tabs were on an unreachable-page state. The browser inspection tool rejected selecting that error tab under its URL policy; no workaround was attempted. Development verification uses the authored test suite and saved render evidence. The user should refresh the local preview after the build is ready.
