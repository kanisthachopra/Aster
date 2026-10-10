# ASTER account database

Apply `migrations/202610100001_aster_accounts_journey.sql` to the configured Supabase project before enabling persistent accounts. This replaces guest-only persistence; it does not verify that a client actually exercised. A `usable` report is still a browser-derived observation. The server establishes the authenticated owner, calendar date, duplicate handling and accounting transaction, not exercise truth or correct technique.

## API contract

All journey calls run with the signed-in user's access token, never with a client-supplied owner ID. `auth.uid()` is the only account selector.

| RPC | Arguments | Result |
| --- | --- | --- |
| `get_journey` | none | Journey JSON; settles a crossed weekly boundary once |
| `complete_review` | `p_report jsonb`, `p_media_path text = null`, `p_filename text = null`, `p_mimetype text = null` | Journey JSON; inserts a new usable/partial review; only usable can advance today's activity |
| `protect_day` | `p_day date`, `p_allow_reserve boolean = false` | Journey JSON; protects an earlier missed day after account creation; reserve spending requires explicit confirmation |
| `delete_review` | `p_review_id uuid`, `p_media_only boolean = false` | Previous recording path, or null; queues object cleanup and deletes the selected data |

Journey JSON has `entries`, `activity`, `protected`, `regular`, `reserve`, `week`. Entries have `id`, `day`, `exercise`, `report`, `media_path`, `filename`, `mimetype`. Days/weeks are ISO dates. Returned balances are credit amounts (5, 2.5), while database balances/deltas use exact integer half-credit units. `week` starts Monday in the profile's IANA timezone. Report IDs must be UUIDs. The same ID never earns again, including after deletion. Daily participation survives selective review deletion; minimal receipt IDs are retained without media or pose content.

`profiles` columns: `id` (auth UUID), normalized lowercase unique `authorized_id` (3–32 ASCII letters/digits/underscore/hyphen, starts alphanumeric), `callsign`, `timezone`, `onboarding_complete`, optional `recovery_email`, optional `recovery_email_verified_at`, `created_at`. Clients can read only their own profile. The trusted server creates/updates it. Timezone changes after ledger activity require a separately designed calendar migration, preventing repeated dates/weekly rewards from arbitrary timezone switching.

These RPCs and tables are **service-role only**. Their arguments must come from trusted server validation, not arbitrary request forwarding:

| RPC | Arguments | Result |
| --- | --- | --- |
| `consume_rate_limit` | `p_key text`, `p_limit integer`, `p_window_seconds integer`, `p_cost integer = 1` | `{allowed, retry_after, remaining}`; fixed window serialized by key |
| `rotate_recovery` | `p_owner_id uuid`, `p_expected_version bigint`, `p_expected_hash text`, `p_new_salt text`, `p_new_hash text` | Boolean; compare-and-swap rotates exactly one current recovery credential |
| `consume_email_code` | `p_owner_id uuid`, `p_purpose text`, `p_expected_hash text` | Boolean; deletes exactly one matching unexpired email code |

Recovery command hashing/normalization, constant-time comparison, scrypt and pepper live on the server. `recovery_credentials` stores `owner_id`, `salt`, `secret_hash`, `version`, `updated_at`, and is inaccessible to anonymous/authenticated clients. The CAS is a single-use claim, not the password update itself: coordinate it carefully with Supabase Auth Admin password changes and return the new recovery kit only through the authorized recovery response. Handle an Auth Admin failure explicitly; do not claim recovery succeeded merely because the credential rotated.

`recovery_email_codes` has `(owner_id,purpose)` primary key, `email`, `salt`, `code_hash`, `expires_at`, `attempts`. `purpose` is `verify` or `recover`. A previously verified email is required for recovery. The service must rate-limit attempts before reading/verifying the code; the claim RPC does not implement hashing or increment incorrect-attempt counts. Hash account/IP keys before limiter storage. Use distinct stable keys for per-account auth, per-IP auth, per-user speech and global speech character budgets. Limiter windows are fixed once a key exists; use a new versioned key when changing the window. Limits are not browser-controlled. Denied calls do not spend usage; consumed reservations are not automatically refunded on provider failure.

`app_sessions` is service-role only: `id_hash` is a 64-character lowercase hexadecimal HMAC digest of a random server-issued session nonce, `owner_id` references the profile with cascading deletion, and `expires_at` defaults to 30 days. The backend verifies the Auth token and this row before serving application requests. Login inserts a row, logout deletes the current row, and successful recovery deletes all owner rows before starting a fresh session. This gives immediate revocation on the application API. A copied raw Supabase Auth JWT can still satisfy direct database RLS until its own expiry; the database does not bind the nonce cookie to JWT claims.

## Recording lifecycle

The bucket is `aster-recordings`, private, maximum 150 MiB. Storage keys have exactly `ownerUUID/reviewUUID/randomUUID.ext`. The server records `media_uploads` with path, owner/review, expected bytes, MIME and expiration before issuing a signed upload. The server checks the actual uploaded object size and MIME before setting `verified_at`; intent metadata supplied by the browser alone is not verification. `complete_review` checks the matching owner/review path, expiration, verified timestamp and MIME, then sets `consumed_at` in the same transaction as the review.

Authenticated storage reads require both the owner folder and a retained review referencing that object. There are no direct browser write/delete storage policies. Signed URLs are bearer grants and can remain usable until their short expiry; storage removal revokes the underlying object. Do not use a public bucket or permanent public media URLs.

Media-only deletion clears the reference, filename/MIME, `frames`, `trackedFrames`, `rawLandmarks` and `landmarks` from the retained report and sets `sourceMediaDeleted`. Full deletion removes the whole report. Both atomically queue an object path in `media_deletion_queue`. The server removes that object through the Storage API and marks `completed_at`, retrying failed pending cleanup. The UI must not claim physical media cleanup succeeded while that operation is still pending. Removing database metadata alone does not delete an object. A scheduled cleanup should drain expired unused upload intents as well; backups and existing short-lived signed links require a documented retention policy before production claims.

## Progression

One locked energy-state row serializes completion, protection, deletion and rollover per owner. Daily awards are 5, 5, 5, 2.5, 2.5, then 0. Regular credits reset weekly. Seven actual activity days and no protection spending in/for that week earn 2.5 reserve once, capped at 100. Protection costs 10, spends regular first, requires explicit reserve consent, never awards activity, and is capped at three per week containing the protected date. Earlier missed account days can be protected using currently available funds; expired regular funds cannot be reused. Partial reports never award activity or credits. SQL grants prevent users and the service role from updating/deleting ledger entries; account deletion by the database owner can cascade the entire account.

## Verification

From `supabase/tests`, run `npm ci` and `npm test`. Ten tests currently execute the actual migration in PGlite (PostgreSQL compiled to WASM). Supabase's `auth`/`storage` schemas and roles are explicit stand-ins. Tests cover RLS isolation, normalized IDs, timezone validation, duplicate requests, award curve, rollover/cap, protection, private recording association/deletion, single-use recovery, email-code claiming and global rate budgets. A test-only clock replacement drives seven calendar days; the deployed migration has no client-controllable date argument.

PGlite runs one connection and serializes submitted queries. Overlapping JavaScript calls verify atomic outcomes in that engine, **not multi-connection production lock contention**. Hosted PostgREST privileges, real JWTs, GoTrue recovery, signed upload byte checks, object deletion, real multi-session races and failure recovery still require integration verification against a disposable Supabase project. Do not describe these local tests as hosted verification.

Primary design references: [Supabase functions and fixed search paths](https://supabase.com/docs/guides/database/functions), [row-level security](https://supabase.com/docs/guides/database/postgres/row-level-security), [private Storage access control](https://supabase.com/docs/guides/storage/security/access-control).
