# Original playback fixture

`playback.mp4` is a two-second synthetic colour test pattern generated locally for playback verification. It contains no person, private data, audio or exercise evidence. Never show it as a model analysis example.

Reproduce with FFmpeg:

```text
ffmpeg -f lavfi -i testsrc=size=320x240:rate=15 -t 2 -c:v libx264 -pix_fmt yuv420p -movflags +faststart playback.mp4
```

The application and normal test runs do not need FFmpeg; the small fixture is retained in the repository. The one-time generator was obtained from the npm package `@ffmpeg-installer/win32-x64@4.1.0` and is excluded from source control.

`portrait.mp4` is the same original test pattern rotated 90 degrees with `-vf transpose=1`. It verifies portrait preview proportions and that Analyze movement stays visible. It contains no exercise or personal media.
