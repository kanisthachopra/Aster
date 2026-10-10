# Spoken feedback access repair

10 October 2026. The learner reported failed spoken exercise feedback and confirmed they were using guest mode.

## Observed cause

The live `/api/speech/config` returned 401 to a guest with `Sign in to restore your journey.` The client discarded that explanation and substituted a generic connection failure. Retrying without an account could not succeed. A disposable signed-in account received a valid configuration for `aura-2-thalia-en`; an actual short hosted request returned 200, `audio/mpeg`, and 38,736 bytes. The account was removed after the check. Neither credentials nor private recordings were disclosed.

## Repair

- Preserve configuration error messages; map speech 401 responses to explicit account access, including session expiry between configuration and generation.
- Explain guest written analysis before the person analyzes a clip.
- Offer `Sign in & hear my feedback` inside the finished review.
- Keep the same file, object URL and report mounted while the account dialog is shown. Cancellation and failed sign-in preserve it. Successful sign-in returns to the station and automatically reads the existing report without repeating inference.
- Keep authentication, provider settings and budgets unchanged. Recorded scene dialogue still works for guests.

## Verification

27 regression checks passed across speech playback, review recovery, account entry/panels, prerecorded dialogue and the new guest account transition. The real-App transition check used stubbed account/voice services and an actual local video analysis. It verified cancellation, a rejected password, unchanged video object URL and report title, and one automatic reading after successful sign-in. Separate browser checks cover configuration 401, session expiry during generation and preserving a 503 explanation. The production build passed, with the existing large 3D bundle advisory.

An initial run of the new transition test used an incorrect video selector; the corrected focused rerun passed. An early hosted diagnostic stopped while the review was visibly speaking because its script used the default 30-second wait instead of its intended 90-second completion wait; this was a diagnostic-script error, not evidence of failed synthesis. The screenshot and audit are ignored local artifacts.

The published bundle `/assets/index-1K3Iuq4k.js` was then verified at `https://aster.kcmira.me`. Fourteen hosted checks passed through the actual App: guest expedition, ordinary station controls, public Navy clip upload, local inference, explicit guest sign-in explanation without generation, cancellation with preserved object URL, real account sign-in with the same video/report, completed automatic review reading, replay and Stop. The synthetic Supabase account was removed, and no browser runtime errors occurred. Only the public exercise fixture was used; no private recording was uploaded.

The actual review returned HTTP 200 with 164,016 bytes of MP3. Its decoded source RMS was 0.05055 in a running AudioContext and the browser output peak was 0.17931. Automatic reading reached `ready`; replay issued one additional successful generation request and started playback; Stop returned `paused`. These measurements verify browser output rather than a particular physical speaker's volume. The ignored audit is `frontend/artifacts/voice-production-check.json`, with a screenshot in `voice-production-check.png`. Authentication, API keys and budgets were not changed.

This repair addresses voice access and playback. It does not change exercise tracking, expand the supported corrections or establish form-analysis accuracy.
