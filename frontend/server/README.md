# Outpost account boundary

`api/outpost.ts` exports one Node request handler for Vercel. `outpostPlugin` mounts the same handler in local Vite development/preview. With cloud credentials configured, local `/api/speech/config` and `/api/speech/review` delegate to authenticated account speech. Without them, the existing local-only speech service remains available. Static hosting without a Node function cannot provide accounts.

Server environment: `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`, `APP_ORIGIN`, and `RECOVERY_PEPPER` (at least 32 characters). Keep the pepper stable and backed up separately: changing it invalidates recovery hashes, app session proofs and limiter key continuity. `RESEND_API_KEY` plus `EMAIL_FROM` enable optional verification emails. Existing `DEEPGRAM_API_KEY` and optional `DEEPGRAM_TTS_MODEL` enable authenticated reading. None use `VITE_` prefixes. Secrets and the pepper never appear in responses; the intentionally public publishable key accompanies a scoped signed resumable-upload grant.

Apply the complete Supabase migration, including `app_sessions`, before enabling this handler. Supabase Auth should disable public sign-up: registration goes through the bounded server Admin route. Auth email is a random synthetic `@aster.invalid` address; optional recovery email is managed separately and must be verified by a six-digit, ten-minute email code before recovery. The Supabase email-confirmed flag on the synthetic identity is not proof of ownership of the optional email.

All actions use `/api/outpost?action=ACTION`. GET actions: `session`, `journey`, `speech-config`. Other actions use JSON POST, at most 128 KiB, matching `APP_ORIGIN` or the exact trusted `VERCEL_URL` origin. Local non-Vercel use additionally accepts a loopback request whose Origin matches its validated localhost/127.0.0.1 Host. No wildcard preview origin is allowed. Responses are no-store. Errors expose a short app message, never provider errors or credentials.

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
