# Original neural dialogue — revision 0.4

Generated locally on 2026-10-08 using the official [Kokoro](https://github.com/hexgrad/kokoro) JavaScript package `kokoro-js@1.2.1` and [Kokoro-82M-v1.0 ONNX](https://huggingface.co/onnx-community/Kokoro-82M-v1.0-ONNX), q8 on CPU. Traveller uses the model's `am_puck` voice; ORBIT uses `af_heart`. These are synthetic preset voices, not voice clones or recordings of a performer.

Canonical scripts live in `src/game/dialogue.json`; this folder's `dialogue.json` records the text, role, voice and model for each rendered file. The dialogue is original project writing. All generation ran on this computer. User video/audio was not used to train, clone, generate or upload speech. Model/package weights are Apache-2.0; license text is included as KOKORO-LICENSE.txt. The model is development tooling, not a download required by the app.

Files are 24 kHz mono PCM16 WAV, normalized to -19 LUFS with -2 dBTP ceiling. The browser fetches the generated files from this app and performs no cloud TTS request. The traveller is dry and close in the mix. Dialogue starts the opening; the former looping white-noise breathing effect has been removed. The score enters after the initial spoken moment. Skipping the opening stops its speech.

The previous Microsoft system-voice recordings have been replaced. Naturalness and dramatic performance still require listening review; a neural voice is not a claim of human voice acting. No film/game soundtrack or actor imitation is included.
