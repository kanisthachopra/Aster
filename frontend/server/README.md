# Outpost account boundary

`api/outpost.ts` exports one Node request handler for Vercel. `outpostPlugin` mounts the same handler in local Vite development/preview. With cloud credentials configured, local `/api/speech/config` and `/api/speech/review` delegate to authenticated account speech. Without them, the existing local-only speech service remains available. Static hosting without a Node function cannot provide accounts.

Server environment: `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`, `APP_ORIGIN`, and `RECOVERY_PEPPER` (at least 32 characters). Keep the pepper stable and backed up separately: changing it invalidates recovery hashes, app session proofs and limiter key continuity. `RESEND_API_KEY` plus `EMAIL_FROM` enable optional verification emails. Existing `DEEPGRAM_API_KEY` and optional `DEEPGRAM_TTS_MODEL` enable authenticated reading. None use `VITE_` prefixes. Secrets and the pepper never appear in responses; the intentionally public publishable key accompanies a scoped signed resumable-upload grant.

Apply the complete Supabase migration, including `app_sessions`, before enabling this handler. Supabase Auth should disable public sign-up: registration goes through the bounded server Admin route. Auth email is a random synthetic `@aster.invalid` address; optional recovery email is managed separately and must be verified by a six-digit, ten-minute email code before recovery. The Supabase email-confirmed flag on the synthetic identity is not proof of ownership of the optional email.

All actions use `/api/outpost?action=ACTION`. GET actions: `session`, `journey`, `speech-config`, `coach-config`, `vision-config`. Other actions use JSON POST, at most 128 KiB (1 MiB for `vision-context`), matching `APP_ORIGIN` or the exact trusted `VERCEL_URL` origin. Local non-Vercel use additionally accepts a loopback request whose Origin matches its validated localhost/127.0.0.1 Host. No wildcard preview origin is allowed. Responses are no-store. Errors expose a short app message, never provider errors or credentials.

For Aster Production (`APP_ORIGIN=https://aster.kcmira.me`), the exact owned fallback address `https://aster-ruddy.vercel.app` is also allowed. This keeps sign-in, journal saves and voice usable when a visitor's DNS cannot resolve the custom domain. Cookies remain host-scoped; a visitor signs in separately on each address. Arbitrary request Host headers and other Vercel projects do not grant origin trust.

| Action | Body | Result |
| --- | --- | --- |
| session | — | configured, authenticated, emailAvailable; profile and journey when signed in |
| register | authorizedId, password, callsign?, timezone?, email? | profile, journey, one-time recoveryCommand, emailAvailable |
| login | authorizedId, password | profile, journey |
| logout | {} | ok |
| recover-command | authorizedId, command, newPassword | profile, journey, newly rotated recoveryCommand |
| recovery-rotate | password | newly rotated recoveryCommand |
| recover-email/send | authorizedId | non-enumerating message |
| recover-email/verify | authorizedId, code, newPassword | profile, journey, newly rotated recoveryCommand |
| email/send | email | message; requires signed-in account |
| email/verify | code | profile; requires signed-in account |
| profile | callsign?, timezone?, onboardingComplete? | profile |
| journey | — | Journey |
| protect | day, allowReserve | Journey |
| reviews/complete | report, mediaPath?, filename?, mimeType? | Journey |
| media/upload-intent | reviewId, filename, mimeType, size | path, uploadUrl, headers, token, resumableUrl, resumableHeaders, bucketName, objectName, expiresIn |
| media/sign | reviewId | url, expiresIn=300 |
| journal/delete | reviewId, mediaOnly | Journey after storage removal |
| speech-config | — | available, model, maxCharacters; cookie-session compatibility marker |
| speech-review | purpose="review", text | MP3 audio |

Authorized IDs are normalized to lowercase, 3–32 letters/digits/underscore/hyphen, starting with a letter/digit. Passwords are 12–128 characters; Supabase Auth hashes and checks them. Recovery commands contain three independently random twelve-hex-digit chunks (144 bits total); comparison ignores case, spaces and hyphens. Scrypt uses a random salt and server pepper. Only the salted hash is stored. A compare-and-swap rotates a valid command once; the complete existing journey remains associated with the same auth user.

Access/refresh tokens stay in HttpOnly SameSite=Lax cookies, Secure and `__Host-` prefixed on the HTTPS deployment. Protected requests call Supabase Auth `getUser` and check a separate expiring server session proof. The proof is random, stored only as an HMAC hash in `app_sessions`. Logout removes that proof immediately; successful recovery removes all prior app sessions. This avoids treating a not-yet-expired JWT as sufficient after logout/recovery. Refresh is bounded to one attempt. Auth APIs still require proper Supabase project-level policies and provider limits.

Registration cleans up a newly created Auth user if profile, recovery setup or initial sign-in/journey retrieval fails. Recovery claims, Auth password changes and network responses cannot be one database transaction: on completion failure, the server attempts a compare-and-swap restoration of the former recovery command. A password may already have changed, so the submitted new password can be used for login; the former recovery command remains the fallback if restoration succeeded. During an extended provider outage even compensating cleanup can fail—do not promise impossible distributed rollback. No successful response is emitted on a failed password update or missing journey.

Videos upload directly to the private `aster-recordings` bucket, never through the JSON function. The server creates a constrained upload intent and signs a unique owner/review path. For larger files the client uses the signed token as the TUS `x-signature` together with the publishable `apikey` header, the `/upload/resumable/sign` endpoint, a six-MiB chunk size, and the direct storage hostname. Before accepting a review, the server reads actual Storage object size/type and marks the intent verified; the transaction checks ownership and consumption. Signed playback URLs expire after five minutes. Deletion queues a path transactionally, removes it from Storage, then marks cleanup complete; failed cleanup is retried on the next deletion request. A production retention job should also remove expired unused uploads and regularly drain deletion queues. This prototype does not claim backup erasure or automatic expired-upload cleanup.

Saved reports are whitelisted and bounded, and raw frames/landmarks are discarded. The report is still browser-derived. The server validates ownership, timestamps, structure, idempotent credit accounting and stored object metadata; it does not independently prove correct exercise form or that the user performed the exercise. Do not present earned credits as a medical or anti-cheat guarantee.

Rate limits use serialized persistent SQL counters: login/account recovery and registration have separate IP/account windows; authenticated requests are bounded; hosted speech is six requests/minute and 20,000 characters/day per user plus 100,000/day globally. Failed provider attempts count conservatively. These are application guardrails, not a provider billing cap. Hosted speech sends only text, uses a fixed model allowlist and provider URL with model-improvement opt-out, limits returned audio to two MiB and aborts on disconnect/25-second timeout.

`tests/outpost-server.spec.ts` uses simulated Supabase/Resend responses, not live credentials. Eleven tests cover unconfigured behavior, origins, cookies, actual getUser calls, bounded refresh, logout revocation, registration/recovery rollback, concurrent single-use command rotation, optional verified email, media ownership/metadata, and report stripping. These tests do not prove that a hosted project's grants, storage URLs, email delivery or real Auth behavior are configured correctly; run the separate hosted integration checks before declaring deployment complete.

Primary API references: [Supabase Auth REST](https://supabase.com/docs/reference/self-hosting-auth/get-a-user), [server-side sessions](https://supabase.com/docs/guides/auth/server-side/advanced-guide), [signed resumable uploads](https://supabase.com/docs/guides/storage/uploads/resumable-uploads), [Storage implementation](https://github.com/supabase/storage-js/blob/master/src/packages/StorageFileApi.ts), [Resend API](https://resend.com/docs/api-reference/emails/send-email).

## Hosted-service verification, 10 October 2026

After the actual migration was applied, `tests/outpost-live.spec.ts` passed 25 checks against the configured Supabase project in 37.7 seconds. It created two disposable accounts, exercised real Auth/cookies/session restoration, uploaded a small MP4 directly and a seven-MiB MP4 through signed TUS, checked actual stored bytes, saved a synthetic review, verified exactly five credits with no duplicate award, checked owner-only playback, and restored the complete journey with a case-insensitive recovery command. The used command was rejected. Media-only deletion preserved the report and removed the Storage object; full deletion preserved only earned accounting; the new password worked. All disposable users and objects were removed, with cleanup confirmed in the ignored aggregate artifact `artifacts/outpost-live-verification.json`.

The first live TUS attempt exposed a real integration mismatch: a signed upload uses `/upload/resumable/sign` and both the publishable `apikey` and scoped `x-signature` headers. The backend/client contract was corrected and the complete live test then passed. This is why simulated responses alone were insufficient.

The test uses a local instance of the actual handler against hosted services and a trusted-proxy test address to avoid spending a user's localhost auth-attempt allowance. It does not verify Vercel routing, browser deployment cookies, email delivery, paid hosted voice or genuine exercise quality. Its report is intentionally synthetic and exercises persistence/accounting only. To run intentionally after applying the migration:

```powershell
$env:ASTER_LIVE_ACCOUNTS = '1'
npx playwright test --config=tests/server.config.ts tests/outpost-live.spec.ts --trace=off
```

Without this opt-in it skips. Environment values and generated recovery commands remain in memory; traces/video/screenshots are disabled. The aggregate record contains only checks and cleanup status. Failed runs also attempt cleanup. The HTTP-only configuration avoids starting or interrupting the shared Vite server.

## Optional conversational explanation

Set NEBIUS_API_KEY and NEBIUS_COACH_MODEL in the ignored local environment and Vercel Production environment. The actual tested model is Qwen/Qwen3-30B-A3B-Instruct-2507. Never expose the key through a VITE_ variable. Existing Supabase/Deepgram settings and recovery pepper must be preserved.

Authenticated GET coach-config returns availability. POST coach-question requires consent=true, exercise, cueId and a question of at most 600 characters; goal is an approved enum. The server constructs the fixed educational cue itself. Client-submitted observations, corrections, URLs and raw landmarks are not accepted as prompt content. Rate limits are eight requests/minute, 16,000 input-equivalent characters/day per user, plus 100,000/day globally; failed attempts count conservatively. These are application guardrails, not a hard provider billing cap.

The fixed Nebius endpoint returns a strict schema selection of existing card parts. The server validates again and assembles the response from its reviewed text. It cannot add a new exercise fault, diagnosis, safe range, load or rep count. Identified health questions remain local; this keyword guard is not a claim to detect every possible sensitive disclosure. The client advises users to keep private details out of opted-in questions. No conversation history or raw media is stored by this route. Provider errors use a local explanation, with a 25-second deadline and 16-KiB response bound.

Eight service tests and three additional outpost guard tests cover strict selection, malformed output, sensitive-question bypass, timeout/cancellation, consent, trusted-card matching, authentication and budgets. A small live synthetic request verified actual strict schema behavior; mocked tests alone did not catch the initial json_object shape mismatch.

## Optional image context, 0.10

Use the existing `NEBIUS_API_KEY` with server-only `NEBIUS_VISION_MODEL=google/gemma-3-27b-it`. No browser key or database migration is needed. GET `vision-config` requires a verified account and returns availability/model only. POST `vision-context` requires `consent:true`, an approved comfort enum, exercise/variant/goal enums, and 2–6 numbered JPEG snapshots with increasing timestamps. The UI previews six originals before sharing; it re-encodes them locally at at most 512 pixels on the long side. It sends no full video, raw landmarks, account details or injury text.

Pain/instability bypasses the provider. The persistent budgets are 4 attempts/10 minutes and 20/day per account, plus 200/day globally. Authentication and cost controls are isolated per user; no shared conversation or automatic learning from uploads exists. Invalid or failed attempts count conservatively. The fixed service rejects oversized/malformed JPEG structure, extra context fields, advice, phase labels and unknown frame indices. Each image is under 100 KiB; dimensions are at most 768 pixels; requests have a 25-second deadline and bounded responses. The body is reconstructed from allowed fields before inference. Cancellation aborts pending work and discards stale responses.

Only exercise category, view, visible-region names and supporting input-frame indices return. These are tentative context, not a technique verdict or replacement for local temporal evidence. The request uses `store:false`; this is not a guarantee about all provider logging. Nebius processing policy applies. Aster does not persist snapshot copies or provider conversation content. Notes retain the analysis/knowledge version but not raw frames. Research contribution is a separate future consent process.

Nine service tests, three route guard tests and three UI tests cover these boundaries. An actual final-service request on four public Navy images returned valid context in 2.528 seconds; this verifies connectivity/output shape, not visual correctness on user footage. [Source ledger](../../research/movement-sources.md) records all provider diagnostics and their limits.
