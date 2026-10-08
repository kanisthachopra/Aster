# Skills review · ASTER v0.4

Reviewed the official [emilkowalski/skills](https://github.com/emilkowalski/skills) repository on 8 October 2026, commit `e8a175de22ae1e49370fc144c1f3bb9aeedf988d`. The MIT-licensed source is retained in ignored `.tools/emil-skills`; installed personal skills were not overwritten. All **14 SKILL.md files** were read. Reading a skill does not mean importing its framework or running an irrelevant workflow.

## Applicability

| Skill | Decision for this desktop React/Babylon app | Applied result or reason |
| --- | --- | --- |
| `animate` | Apply | Gate motion by purpose and frequency; immediate game input; pointer-only 220 ms panel reveal using the existing strong ease-out token; compositor timing indicator; no new animation dependency. |
| `animate-expo` | Apply transferable principles; defer native APIs | Separate rendering from interaction, keep gameplay input immediate, clean up animations, and provide reduced-motion alternatives. Reanimated, worklets, native gesture APIs, and Expo installation do not belong in a browser build. |
| `animation-vocabulary` | Use for precise communication | Describe the panel as a short fade/translate/scale entrance, title as a staggered reveal, and gameplay signal as a state change. Avoid ambiguous requests for more animation everywhere. |
| `apple-design` | Apply selectively | Layered surfaces, understated press feedback, clear focus, coherent hierarchy, and restrained physicality. No artificial spring or inertia on first-person look or reaction input. |
| `ask-sonner` | Inspected; no library added | Existing robot, mission, and inline status surfaces already carry feedback. Adding a competing toast system would duplicate messages. |
| `break-ui` | Apply | Exercise long non-Latin/emoji headings, a narrow desktop window, keyboard play, disabled controls, interrupted rounds, initial empty scores, and restart/exit. Fix wrapping and shrinking instead of hiding content. |
| `emil-design-eng` | Apply | Improve typography, contrast, panel depth, focusable native controls, hover gating, tabular readouts, and game-HUD hierarchy. Preserve the established visual identity. |
| `find-animation-opportunities` | Apply as audit input | Found a meaningful pointer panel entrance; rejected decorative per-step text animations and extra motion on already busy gameplay. Functional signals and state changes must remain immediate. |
| `improve-animations` | Apply audit principles | Inspect frequency, curves, properties, interruption, accessibility, and cohesion before editing. Findings are resolved in this authorized implementation rather than leaving a separate unexecuted plan. |
| `mobile-native` | Apply platform-neutral details; defer phone claims | Keep zoom available, native focus, contained panel scrolling, hover-capable pointer rules, and usable targets. Phone hardware/virtual keyboard verification is outside this computer-first release. |
| `pick-ui-library` | Apply the selection gate | Native dialog already provides modal focus containment and Escape handling. CSS/WAAPI and existing React meet the needs; no replacement UI framework is needed. |
| `prototype` | Inspected; not run | The user has chosen an immersive HUD direction and asked for improvements, not several competing designs with a picker. |
| `review-animations` | Apply | Review and correct motion before accepting the implementation. Findings and verdict below use its required format. |
| `write-swift` | Inspected; not applicable | There is no Swift or Apple-native target in this browser project. Do not translate Swift concurrency or value-model rules into unrelated code. |

Referenced standards read: `performance-cheatsheet.md`, `animate/RECIPES.md`, `review-animations/STANDARDS.md`, `improve-animations/AUDIT.md`, `improve-animations/PLAN-TEMPLATE.md`, and `break-ui/CATALOG.md`. Native-only Expo recipes, Sonner API setup, and the prototype picker were not used because their corresponding implementations are not being introduced.

## What changed

The HUD now uses a compact shared instrument surface, warmer mission accents, clearer labels, and quieter borders. The holographic panel has a legible dark glass base, layered shadows, a restrained top rim, and larger reading text. The survey map includes the actual recreation console positions as well as exercise stations, with uncluttered abbreviated icons when collapsed.

ORBIT's five-step orientation covers evidence and uncertainty, completing a review, energy rules, recreation, and settings/journal controls. Spoken and displayed lines come from one dialogue file. Text is readable immediately; it is not gated behind typing effects.

Three playable recreation games are implemented: Signal response (random wait, early-input failure, measured reaction time), Echo sequence (reproduce an increasingly long pattern with mouse or number keys), and Orbital alignment (stop a moving signal near the center). Scores are local to the panel and never write workout activities or energy. Hidden-tab interruptions cancel/pause rounds, and unmount cleans up timers and animation. Reduced-motion timing uses discrete numbers instead of a moving marker.

## Animation review

| Before | After | Why |
| --- | --- | --- |
| Every panel used a 200 ms keyframe, including keyboard shortcuts. | Keyboard-opened panels are immediate. Pointer entry uses an interruptible CSS `@starting-style` transition: 220 ms, `cubic-bezier(.23,1,.32,1)`, opacity plus 6 px / .98 scale. | Frequent controls should not wait; occasional entry can explain the new layer. |
| All eyebrow labels replayed a fade. | Removed the universal eyebrow animation; tour content changes immediately. | Reading and repeated navigation benefit more from stability than decoration. |
| Generic press movement combined translation and scale. | One subtle scale response for pointer buttons; keyboard and timing-sensitive game actions are immediate. | Avoid competing transforms and remove latency from precise input. |
| A proposed JS animation loop would move the timing marker every frame. | WAAPI animates the complete transform directly; React only handles discrete states and results. | Predetermined motion should stay independent of React rendering and heavy 3D work. |
| Reduced-motion controls removed all visual feedback. | Keep short color changes while dropping positional motion; use numeric timing mode. | Feedback remains comprehensible without spatial animation. |
| New game and map surfaces could become a second decorative animation system. | Static orbital illustration, instant map resizing, immediate light/pattern signals; reuse established easing and duration tokens. | Cohesion and task clarity matter more than motion quantity. |

The title's existing 900 ms letter arrival remains intentionally limited to the rare cinematic title screen and follows the existing stagger. It is not a repeated application control. Gameplay movement is distinct from decorative interface animation. The orbit marker's continuous linear motion is the actual timing challenge; its reduced-motion alternative remains playable.

**Accessibility:** Native modal focus containment is retained. Testing revealed React unmount could remove the dialog before the browser restored focus; `frontend/src/components/Panel.tsx:19` now restores the still-connected opener unless another modal is present. The heading receives initial focus (`Panel.tsx:27`), Escape closes immediately, and keyboard opening has no entrance motion (`Panel.tsx:10`, `styles.css:267`). Both OS and in-app reduced-motion preferences select the numeric timing mode (`MiniGames.tsx:37`).

**Performance and timing:** The orbit uses WAAPI with a full transform string (`MiniGames.tsx:142`), cancels on exit, and freezes at the submitted position. The 220 ms pointer-only panel transition lives at `styles.css:254`; reduced motion drops its transform at `styles.css:341`. No animation library was added. The remaining per-frame Babylon rendering is outside this interface review.

Verification: production TypeScript/Vite build passed. Four focused Playwright checks passed: reaction early/success and cancellation; memory keyboard advancement and mistake handling; reduced-motion perfect alignment plus long-text/narrow-panel layout, heading focus, Escape and focus return; normal orbit motion and exact stop. Screenshots of all three games and the long-text case were opened and visually reviewed. The narrow case scrolls vertically without horizontal overflow. This is desktop browser verification, not a claim of phone hardware testing or a final whole-world performance audit.

**Verdict: Approve the reviewed interface motion.** No remaining feel-breaking UI motion was found in this scope. Frequent and keyboard controls are immediate, the rare title reveal remains deliberate, reduced motion preserves useful state feedback, and the recreation animation is functional rather than decorative. Final integrated world verification is coordinated separately so simultaneous graphics edits cannot invalidate it.
