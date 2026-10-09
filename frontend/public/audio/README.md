# Original dialogue recordings, revision 0.6

All 17 WAV files were generated successfully on 9 October 2026 through the [Deepgram Aura REST API](https://developers.deepgram.com/reference/text-to-speech/speak-request). The traveller uses **Aura 2 Apollo** (`aura-2-apollo-en`); ORBIT uses **Aura 2 Thalia** (`aura-2-thalia-en`), matching the user's selected live review voice. These are provider preset synthetic voices. No person's voice was cloned and no actor was imitated.

The traveller's writing moves from checking the suit to noticing a light, calling into an empty building, surprise, then uncertainty about the machine. Short questions and uneven phrase lengths replace a continuous explanatory delivery. ORBIT is welcoming and conversational, with small asides in the tour, measured uncertainty during analysis, and a brighter first-review response. These are writing and casting choices, not an assertion that a human performer recorded the lines.

Delivery uses punctuation, contractions and occasional hesitation, following [Deepgram's Aura prompting guidance](https://developers.deepgram.com/docs/text-to-speech-prompting). No SSML, hidden acting instructions, unsupported emotion tags, pitch shifting or artificial vocal distortion is included. Apollo and Thalia were selected from the [official voice catalogue](https://developers.deepgram.com/docs/tts-models). Aura's interpretation of pauses and emphasis varies; no deterministic emotion control or listener approval is claimed. Final dramatic naturalness needs listening review in the scene mix.

## Provenance and privacy

The original script is `frontend/src/game/dialogue.json`. This folder's `dialogue.json` records each exact text, voice, provider, generation time, measured duration and SHA-256 of the shipped WAV. Seventeen successful provider responses generated 106.88 seconds of audio; response headers reported 1,500 processed characters in total. The only uploaded material was the fixed original dialogue text. No workout clip, photograph, personal review, biometric data or user voice was used. Requests set `mip_opt_out=true`.

The generation script reads the key only into a local Node process from the environment or ignored `frontend/.env.local`. It does not log credentials or place them in browser files. The browser plays the resulting local files; these cinematic clips require no runtime cloud request. Live review narration is a separate server-mediated feature. The retained `KOKORO-LICENSE.txt` describes the previous revision's local generation tool, not these replacement Deepgram outputs.

## Reproduce and verify

From the project root, run `node frontend/scripts/render-dialogue.mjs` with a configured `DEEPGRAM_API_KEY` and FFmpeg at `.tools/ffmpeg.exe` (or set `FFMPEG_PATH`). Generation incurs provider usage. The script accepts only the fixed 17-line script, caps its total at 5,000 characters, uses fixed role-specific voice IDs, and performs no automatic paid retries. A hash-keyed cache under ignored `.tools/voice-studio/deepgram-aura2` prevents resending unchanged lines. It publishes the set only after every cue has generated and normalized successfully.

Audio is mono PCM16 WAV at 24 kHz. Two-pass FFmpeg normalization targets **-19 LUFS**, **-2 dBTP**, with a 9 LU loudness-range target. There is no added reverb; scene mixing belongs to AudioDirector. The generation step fully decodes each recording during normalization and checks RIFF/WAVE PCM samples and durations. This establishes playable, consistently mastered assets, not a perceptual guarantee.

## Cinematic timing

| Cue | Seconds |
| --- | ---: |
| opening | 5.84 |
| threshold | 5.28 |
| lights | 4.08 |
| machine | 2.96 |
| robot | 3.44 |
| greeting | 4.72 |

Allow a small gap after each line rather than cutting directly to the next voice. In particular, the lights cue needs more than its former four-second slot, and the greeting needs at least 5.2 seconds before another spoken onboarding cue. All other durations are in the manifest. Skipping or leaving a scene should cancel its voice; it must not queue into the next screen.
