# Aster — Outpost 07

A desktop-browser exercise park on a distant moon. Version **0.10** adds independent checks for visible limbs, pauses that invalidate tempo comparisons, primary feedback for supported strengths, and an optional previewed Nebius image-context check. Persistent private accounts and journals are live. Exercise corrections remain exploratory and need independent expert validation.

## Try it

Requires Node.js 24 and a desktop browser with WebGL2/hardware acceleration.

```powershell
npm --prefix frontend ci
npm --prefix frontend run dev -- --host 127.0.0.1 --port 5174
```

Open **http://127.0.0.1:5174** in Edge or Chrome for unrestricted FPS mouse capture.

1. Select **Begin expedition**. The silent title starts audio only on that interaction. The full opening lasts 12 seconds; skipping is optional.
2. Choose **New to this world**. Explore with WASD, Space to jump, click the world to capture the mouse, Escape to release. Arrow keys also turn. If an embedded browser blocks capture, hold and drag to look; there is no edge panning. Settings includes mouse sensitivity.
3. Find the dome using the terrain survey. Enter its southern airlock for the connected 30-second arrival: traveller enters, perspective returns to first person, lights start, ORBIT emerges and approaches. **Preview dome arrival** is a repeat-testing shortcut.
4. Give an optional callsign. ORBIT introduces reviews, missions, energy, recreation and settings. Choose one of three exercise stations and follow the blue floor markers. Press **E** near a station.
5. Choose a recording with one person, **2–120 seconds**, under 150 MB. A side or three-quarter view is helpful, but other views can provide observations too. Press **Analyze movement**. Watch the sampled recording and its actual tracked joints advance together. You can hide tracking or stop processing. Gaps are left unmeasured.
6. ORBIT gives one next step and explains why. Replay the marked movement, ask **Why does that help?** or **How do I try it?**, or mention discomfort. General practice tips are labeled separately from detected patterns. Written notes, measurements and sources remain behind disclosures. Acknowledge the feedback and **Finish review & return** to save useful coaching notes. Only that final return records qualifying activity and awards daily energy. Partial reviews can be saved without rewards.
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
- Real MediaPipe pose measurements in a background worker; pinned model/runtime served locally. Local tracking needs no API key. Optional snapshot sharing and private-journal video storage each require a separate explicit choice.
- Timestamped observed motion, visible-joint overlays and source links. No invented safe-form score, reference-video match or clinical diagnosis.
- Guest review completion, daily rewards, weekly resets, reserve cap and missed-day protection. The first five activity days award 5, 5, 5, 2.5 and 2.5 credits. All seven actual days without protection earn 2.5 reserve at rollover, capped at 100. Protection costs 10; at most three per week.
- Five-step robot orientation, journal with selective media/review removal, first-mission cue and sound/mouse/motion preferences.
- Seventeen rewritten dialogue clips generated with Deepgram Apollo for the traveller and Thalia for ORBIT. The browser plays these local recordings. Live feedback uses the selected Thalia voice, with short practical wording, replay/Stop controls and recoverable connection errors. Scene timing leaves room for the spoken lines; subtitles and quieter background music remain.
- Three playable recreation games, keyboard controls, reduced-motion alternatives and focus restoration. All 14 official Emil Kowalski skills reviewed, with relevant browser guidance applied.

**Accounts:** ORBIT supports an authorized ID and password, a saved single-use recovery command, and a private Supabase journal. Finishing a review saves its notes and progress; storing the recording requires a separate unchecked-by-default choice. Optional verified-email recovery requires an email provider. Both successful recovery routes restore the same journey. Guest mode still clears its clips and progress on reload. See [account server setup](frontend/server/README.md) and [database setup](supabase/README.md).

**Deployment:** [Aster is hosted at aster.kcmira.me](https://aster.kcmira.me). Vercel uses `frontend` as its root directory, with the Node function and the rewrites in `frontend/vercel.json`. Production server settings are configured; never commit real keys or prefix secrets with `VITE_`. On 2026-10-10, 20 checks against the public HTTPS deployment passed for accounts, secure cookies, private storage, recovery, saved progress and actual Deepgram audio. All disposable test accounts and recordings were removed. Optional email recovery remains unavailable until an email sender is configured.

## Analysis evidence and limits

The new coaching checks use continuous, visible movement across frames rather than narrating elbow angles. They cover push-up coordination/hip position, squat coordination, and conditional strict-pull-up swing/lowering timing. Pull-up lowering examines complete individual reps within a longer set. They do not infer muscle activation, injury, safe loads or a prescribed rep count. An optional pain/instability disclosure overrides the usual cue; assisted and momentum-based variations change which observations are applicable.

The **0.9** replay of **600 cached recordings** yielded specific observations on **128/600**, including corrections on **7/600** (all push-up hip-position checks). These historical coverage counts do not evaluate the new 0.10 rules or correction accuracy. The archive lacks independent form labels. See [the reproducible coaching audit](evaluation/coaching-validation/protocol.md) and [research findings](devpost/coaching-research-0.9.md). No reinforcement learning or 80% form-accuracy claim is made.

Optional Nebius explanations require server-only `NEBIUS_API_KEY` and `NEBIUS_COACH_MODEL` settings; the tested model is `Qwen/Qwen3-30B-A3B-Instruct-2507`. Signed-in users explicitly opt in to sharing a question and a reviewed cue. The provider selects existing explanation sections under a strict schema; it cannot invent new video findings. Video, body points and the injury check-in are excluded. Health-related questions stay local, and provider failures retain a local answer. Never prefix the key with `VITE_`. [Server setup](frontend/server/README.md) describes this boundary.

All **600 distinct public clips** completed actual local inference: 200 pull-ups, 200 push-ups and 200 squats. Sources were split into 360 training, 120 validation and 120 held-out clips. The shipped rule refinement reduced insufficient held-out reviews from 8 to 4, preserved 58 confirmed-cycle reviews, and kept wrong-station completions at 0/240 trials. It improves access to partial observations; it does not validate technique corrections. See the [complete benchmark and limitations](evaluation/results/summary.md).

The trained activity classifier remains **research-only**: its 94.1% accepted-prediction precision came with 84.2% coverage, and the squat precision interval missed the predeclared confidence gate. Repetition counts remain exploratory. **80% form-correction accuracy has not been established**; action labels cannot provide that evidence. A separate [form-validation audit and annotation protocol](evaluation/form-validation/README.md) records available sources and the missing ground truth. This work uses supervised evaluation, not reinforcement learning.

The [cropped-recording audit](evaluation/cropped/README.md) includes eight fresh public cases and three private clips tested entirely locally. The new local limb checks did not produce additional cues in this small actual-video set. The private squat retains a supported coordination strength; the private push-up still loses tracking too often, and the pull-up lacks a supported correction. IMAGE/padding and Heavy-model candidates did not solve those failures and remain experimental. No private media are shipped or sent to Nebius. These results do not establish representative accuracy.

The evolving [movement understanding](research/movement-understanding.md) and [source ledger](research/movement-sources.md) describe each cue's required evidence, variations, counterexamples and update process. Editing Markdown does not automatically train a model. Runtime rules/cards and saved reviews carry separate analysis and knowledge versions.

Optional visual context needs the existing server-only Nebius key plus `NEBIUS_VISION_MODEL=google/gemma-3-27b-it`. In a signed-in review, open **Optional: let ORBIT check the visible context**, preview six locally re-encoded snapshots, then choose whether to send them. The model recognizes the exercise/view/visible regions only; it cannot introduce form faults, supply hidden joints, or confirm safe technique. Context disagreement is disclosed. Pain/instability blocks this route. [Server setup](frontend/server/README.md) documents privacy, limits and cancellation.

See [model provenance and fixture instructions](frontend/public/models/README.md). Test exercise media are ignored local artifacts, not shipped assets.

## Verify

```powershell
npm --prefix frontend run build
npm --prefix frontend test
```

The build typechecks and bundles production assets. Browser tests use installed Microsoft Edge; change the Playwright browser setting if unavailable. Tests reuse the running local server. Optional real-media checks require the documented fixtures; they skip when those files are absent. Real-provider speech testing requires an explicit opt-in and otherwise skips. Screenshots and traces are ignored. See [0.6 verification](devpost/verification-0.6.md), [0.5 verification](devpost/verification-0.5.md), and the [skills review](devpost/skills-review-0.4.md).

## Remaining product work

Qualified exercise-feedback validation and broader useful corrections; licensed professional reference-video comparison; avatar replay driven by supported evidence; finished character models, composed score and final voice direction. Neural voices are synthetic, not recordings of human actors. These remain tracked in the [checklist](devpost/checklist.md), [PRD](devpost/prd.md), [technical plan](devpost/spec.md) and [sound brief](devpost/sound-design.md).

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

Scene assets combine original procedural work with attributed CC0 Poly Haven scans; provenance is bundled in `frontend/public/textures` and `frontend/public/models/boulder`. Dialogue provenance is in `frontend/public/audio/README.md`. MediaPipe license and model provenance are bundled alongside their assets. No film/game soundtrack or third-party character is bundled.
