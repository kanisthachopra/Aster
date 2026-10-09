# Voice and review 0.6 — verification record

Revision date: 9 October 2026. Requested changes: reliable spoken replies, more conversational cutscene delivery, short feedback, and written notes available on demand. No measurement, pose model, benchmark split or trained-model decision was changed.

## User-facing behavior

The review leads with the recording, a brief summary, voice controls and two marked moments. ORBIT automatically speaks a concise reply. **View written feedback** opens the notes; original measurements and sources sit inside a separate disclosure. Recording tips are optional. No angle values, projected-angle terminology or em dashes appear in default spoken feedback.

The presentation layer preserves each supported finding's timestamp and requires matching measured geometry. Hidden joints, unclear exercise identity and abrupt tracking changes retain qualified wording and useful recording guidance. Original detailed evidence remains available; it is not deleted or rewritten as a diagnosed fault. Finish-only reward behavior remains intact.

## Voice repairs and performance

- Missing local production-preview speech middleware was added.
- Browser audio activation now happens during Analyze and is bounded; configuration and provider waits also have deadlines. Startup no longer depends on downloading the opening WAV to read a review.
- Interrupted playback produces an actionable retry state. A late initial connection response cannot override Stop. Retry stays clickable after unavailable/error states.
- Character usage uses a bounded rolling window, with cached replay still permitted. Keys remain server-side and ignored by Git.
- All 17 cinematic/guide WAVs were regenerated through Deepgram Aura 2 with rewritten dialogue, distinct Apollo/Thalia voices, measured durations and consistent mastering. The arrival timeline leaves space after each performed line. Existing filenames remain stable; revised playback URLs avoid the previous cached assets.

These repairs address demonstrated failure paths. The original failure on the learner's browser was not retrospectively identified with certainty. Voice style and intonation can be judged by listening; transport checks alone do not prove a natural performance.

## Checks completed

- **19 focused review/coaching/reward checks passed**, including actual local model processing, compact default content, optional technical details, retry after unavailable voice, Stop during initial connection checking, portrait layout and unchanged rewards.
- **15 speech boundary/recovery checks passed**, covering bounded activation, missing introductory assets, interruption, connection deadlines, cache, quota and server protections.
- **Two cinematic audio checks passed**, including actual opening playback and cancellation on skip.
- **Full-app real-provider check passed** through Begin, arrival, onboarding, walking to the push-up station, a public Navy clip, actual local inference and actual Deepgram narration. Its 333-character reply produced 121,248 audio bytes and played for 20.208 seconds. Decoded voice RMS was 0.0536; running browser master output had peak 0.2348. Completion, cached replay, Stop and written access passed. No report or audio playback was substituted.
- Local production preview returned a configured speech response and rejected a wrong-token request without provider usage. The temporary preview was stopped.
- Final TypeScript/production build passed. The existing large world-bundle advisory remains.
- Screenshots of the compact review and actual voice state were inspected. Raw screenshots and diagnostic artifacts stay ignored.

## Design review

Emil design and animation guidance informed the hierarchy: one recording, one short reply, explicit access to notes. No new UI or motion library was added. The voice badge uses a restrained opacity pulse to indicate speaking; it is not an audio-amplitude graph. System and app reduced-motion settings suppress that pulse. Reading controls do not animate their content. Native disclosures, visible focus, stable speech props, per-reading cancellation and a connection-check generation guard were reviewed.

The previous 600-video findings and form-validation limits still apply. This revision improves presentation and playback, not measured form-correction accuracy.
