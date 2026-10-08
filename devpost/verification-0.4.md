# Movement lab 0.4 — verification record

Revision date: 8 October 2026. Local desktop browser build; no deployment or private-media upload.

## Implemented changes

- Scanned CC0 surfaces and boulders, a geological skyline, physically based lighting/materials and improved habitat details. Rocks and fixtures have collision envelopes with sliding and substeps.
- Conversation-first opening, rewritten traveller/ORBIT lines and seventeen locally generated neural recordings. No looping surf-like breathing effect. Text and voice share one canonical script.
- Full pose model with independent joint-chain measurements, a stable measured side, more tolerant useful-segment handling and explicit partial reviews. Clips may be 2–120 seconds. Hidden joints and tracking gaps remain unknown.
- Exercise-specific recording diagrams and a bounded portrait preview keep the analysis action visible without distorting the video or its pose overlay.
- Three playable recreation stations, five-step robot orientation, clearer panels/HUD/map, keyboard access and reduced-motion alternatives. Recreation never changes exercise credits.
- All fourteen official Emil Kowalski skills reviewed; relevant guidance applied. See [the applicability matrix and animation review](skills-review-0.4.md).

## Evidence reviewed locally

The three supplied recordings were opened as local contact sheets and processed locally. No private video, stills, filenames, model output or diagnostic scripts are tracked or shipped. Their aggregate results are described here without identifying media.

| Exercise example | Observed result | Limit |
| --- | --- | --- |
| Cropped push-up recording | Partial observations from 13 measurable elbow samples; tracking outage identified at approximately 6.3–29.3 seconds. | The working shoulders leave the frame. The app does not claim to review the missing exercise interval or award completion. |
| Longer squat recording | 291 measurable knee samples and eight estimated visible cycles. | A cropped head no longer discards leg measurements. This does not establish appropriate depth or technique safety. |
| Low-angle pull-up recording | 149 measurable elbow samples and one estimated visible cycle. | Reaching/gripping the bar must not count; the rule checks anchored hands and shoulder travel. Hidden lower-body details remain unknown. |

An independent public-domain Navy push-up segment produces 28/28 measurable samples and one estimated visible cycle. Submitting it at the squat or pull-up station cannot earn completion. This is a smoke test, not a general accuracy benchmark. No private clip is a hard-coded reference. Official MoveNet Thunder and image rotations were also tested locally, then discarded because they did not recover reliable joint chains from the severe crop.

## Verification

Production TypeScript/Vite build passed. The main JavaScript chunk is about 1.71 MB (449 KB gzip); Vite still reports its expected large-chunk advisory for this 3D entry point.

All four complete journey scenarios passed on the final app source, across the fresh journey run and a focused exploration rerun: all three stations and rejected footage; real inference → evidence → acknowledgement → energy → journal → media deletion; persistent preferences and the deferred returning-user branch; real keyboard/mouse exploration → discovery → connected arrival → five-step onboarding. The independent seven-second exercise clip completed inference in **5.8 seconds** inside the paused-world review. The exploration test uses actual relative mouse input for precise heading and keyboard movement through an obstacle-free route, not teleportation.

**Final result: 35 distinct checks passed across the final runs.** The other 31 passed together in 1.1 minutes: twelve analysis checks, two audio checks, three collision/world-console checks, four mouse-control checks, five ledger checks, four mini-game checks and one portrait-layout check. No final check was skipped. Portrait layout verification uses an original synthetic colour pattern, not private exercise media. Its rendered screenshot was reviewed: proportions are preserved and Analyze movement is visible.

Repairs found during verification: the former navigation scripts went through objects that are now solid, so station tests approach from the open aisle and exploration follows a collision-checked route using actual keyboard movement. Skipping the opening now settles at its completed forward view. A floor-light arc and low struts were removed from the entrance. One combined automated browser exited and stranded its runner; that interrupted run is not counted as a pass. A fresh browser with tracing disabled is used for the complete journey checks.

Audio checks confirm the title is silent, the opening starts one real local voice buffer before any score oscillator, skipping stops that voice, and every canonical line has a corresponding WAV and manifest entry. Neural speech is synthetic; these checks establish delivery and synchronization, not subjective acting quality.

The UI motion review approved the scoped interface after tests for normal/reduced-motion gameplay, early/wrong answers, focus, Escape, timer cleanup and narrow-window/long-text layout. React review checked effect cleanup, local media URL/worker lifetimes, direct imports, native controls and avoiding per-frame React updates for the timing game.

Visual review opened rendered title, terrain, dome interior, traveller/entrance, all three recreation panels and long-text layouts. Scene screenshot checks reported no page errors. Scanned hero-rock geometry was reduced from roughly 661,000 to 264,000 triangles across ten instances. Initial cold shader loading was visibly slow on this machine (about 15 seconds during development), so the title now exposes preparation state and waits for readiness. This is not a broad hardware performance certification; the stylized character and frame-rate tuning still need further production work.

## Remaining limits

The app still provides projected movement observations and cautious review prompts, not validated individualized form correction. A representative unseen-video evaluation and qualified exercise review remain necessary. Some difficult views yield partial or insufficient evidence even when a human appears in the recording.

Characters remain procedural and stylized, the score remains a temporary original sketch, and the voices need the user's listening feedback. This revision improves the scene; it does not claim AAA photorealism or final cinematic production. Guest media/progress still clear on reload, accounts remain deferred, and reference-video comparison plus evidence-driven avatar replay remain unfinished product work.
