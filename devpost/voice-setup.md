# Connect ORBIT’s live voice

Open `frontend/.env.local` in your editor. An empty key slot is already prepared:

```dotenv
DEEPGRAM_API_KEY=your_key_here
```

Replace `your_key_here` with your own Deepgram API key, save, and restart the local preview server. Keep the key in this file, not in a chat message. Do not add `VITE_` to its name: Vite-prefixed values can be exposed to the browser. `.env.local` is ignored by Git; `.env.example` contains only blank/example settings.

Open a completed review and choose the read-aloud control. Live speech sends the **written review text** to Deepgram. Video, photos, pose frames, and the key are not sent from the browser to Deepgram. The local server makes the authenticated speech request. Unavailable speech is explained on screen; the app never replaces a specific review with a generic success recording.

The initial voice is `aura-2-thalia-en`. To audition a different supported voice, add `DEEPGRAM_TTS_MODEL=aura-2-apollo-en` (or `aura-2-orpheus-en`, `aura-2-luna-en`, `aura-2-asteria-en`) and restart. The integration uses the documented [Aura REST speech endpoint](https://developers.deepgram.com/reference/text-to-speech/speak-request). Conversational punctuation and short phrases help its pacing; see [Aura-2 formatting guidance](https://developers.deepgram.com/docs/improving-aura-2-formatting). This does not claim an unheard voice has already been artistically approved. The existing cinematic recordings remain separate from live review narration.

Every request sets `mip_opt_out=true`, excluding its text/audio from Deepgram’s model-improvement program. Deepgram documents that opted-out data is retained only as needed for processing; metadata and usage logs remain. See [Deepgram’s data policy](https://developers.deepgram.com/trust-security/your-data). Opt-out can affect pricing; use your account’s current [Deepgram pricing](https://deepgram.com/pricing) and usage dashboard rather than assuming free synthesis.

Cost controls: at most 6,000 characters per complete reading, split at sentence boundaries into requests of at most 1,800 characters. Deepgram documents a [2,000-character REST input limit](https://developers.deepgram.com/docs/text-to-speech-latency). The app plays chunks sequentially and one Stop action cancels the entire reading. A single sentence longer than a chunk is reported clearly instead of silently cut. There are six uncached attempts per minute, one request at a time, and 20,000 sent characters per preview-server run by default. `DEEPGRAM_SESSION_CHAR_BUDGET` can change the last limit. Failed attempts count conservatively because the provider may have processed them. Exact replays are cached only in local server memory for up to 20 minutes (eight entries); restarting clears the cache and budget. These are local guardrails, not an account-wide spending cap. Set account limits in Deepgram as well if needed.

This is a **local development connection**. It accepts loopback clients on the app’s own origin, requires a per-run request token, permits only the review request shape, caps request/audio size, and aborts after 25 seconds or when the listener disconnects. It exposes no provider key and logs no review text/provider response. Static production hosting has no speech server and reports live voice unavailable. A public deployment needs authenticated server routes and per-user quotas before enabling paid speech.

Routine verification uses mocked provider responses and makes no paid requests. Server tests cover origin/token/payload limits, provider error sanitization, timeout, cache and budget; browser tests cover exact report text, sequential chunk playback, Stop, and explicit unavailable/muted states. Existing cinematic opening checks still pass.

On 8 October 2026, the local configuration reported a connected `aura-2-thalia-en` voice. One real 295-character sample returned HTTP 200 with 106,704 bytes of MP3 audio and passed a complete decode check. No key was read or printed. The ignored sample is at `frontend/artifacts/deepgram-review-sample.mp3` for listening; transport success does not establish that the learner approves its voice or intonation. The optional `speech-live.spec.ts` check exercises real browser playback and cancellation only when `ASTER_LIVE_SPEECH=1`; use `--trace=off` for this check. It can incur provider usage and is skipped in routine runs.

After receiving the sample, the learner chose **“Keep this voice for now”** on 8 October 2026. Thalia remains the selected feedback voice. That preference does not validate the exercise analysis or imply approval of every generated reading.

The opt-in browser check also passed against the real provider: a short review generated playable audio and completed, its exact replay came from the local cache, and Stop cancelled playback. The check sent only its generic test sentence and did not read the key or use an exercise recording.
