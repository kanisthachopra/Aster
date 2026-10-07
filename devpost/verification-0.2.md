# Exploration build 0.2 verification

Date: 2026-10-07. Story: start the silent title, explore and discover the habitat, enter its activation sequence, meet ORBIT, walk to one of three exercise stations and preview a local recording.

| Boundary | Result | Evidence |
| --- | --- | --- |
| Source to production build | Passed | Strict TypeScript and Vite build completed; main 3D chunk 1.37 MB, 352 KB gzip. Large-chunk advisory remains. |
| Pointer input to camera | Passed | Native capture moves the heading; Escape releases capture. Explicit denial still permits mouse look after button release. Panels stop looking. |
| In-app browser input | Passed | Manual pointer gesture changed heading from 000 to 018 degrees in fallback mode; Escape released it. |
| Exploration to arrival | Passed | Real keyboard movement discovers the dome and enters the cinematic without using the preview shortcut. |
| Arrival to onboarding | Passed | Third-person entry, first-person sky reveal, service-bay startup, subtitles and optional callsign branch render. |
| World to station interface | Passed | Actual movement reaches all three correct station panels; rear-sector bounds stop access. |
| File to local playback | Passed | Invalid text file rejected; original two-second MP4 fixture decodes and plays; leaving returns to the world without completion credit. |
| Preferences and returning-user boundary | Passed | Settings survive reload; unavailable account flow collects no pretend password. |
| Runtime console | Passed in full station journey | No page errors or console errors after fixes. |
| Private server, analysis and rewards | Not implemented in this slice | No analysis results, private account records or earned credits are claimed. |

Final browser run: **5 passed (3.2 minutes)** on installed Microsoft Edge, 1440 by 900 viewport, localhost port 5174. Production build passed on the same application source. Screenshots inspected for title, landscape, dome exterior, third-person entry, interior sky reveal, robot, review and park.

## Repairs made before passing

- Mouse controls used compatibility mouse events suppressed by Babylon's pointer handling. Changed to pointer events and tested actual camera heading changes, not just control text.
- Dynamic texture clones were empty and left terrain/rocks unrendered. Generated and uploaded a proper normal map and shared ring texture pixels directly.
- Added an explicit favicon to eliminate missing-resource errors.
- Corrected test-file encoding so expected text matches the UI.
- Added a physical doorway cutout and sliding doors rather than removing the entire exterior shell during entry.

## Limits of this evidence

Procedural models and synthesized sound establish the revised experience but do not establish photorealism, final voice/music quality, exercise-analysis accuracy or performance on other computers. Human listening review and the learner's retry of the revised experience are still useful. Final visual/audio assets and the functional backend remain tracked in the build checklist.
