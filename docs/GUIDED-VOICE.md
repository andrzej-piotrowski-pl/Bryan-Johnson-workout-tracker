# Local voice coach

Implemented from [proposal PR #1 and its discussion](https://github.com/liviux/Bryan-Johnson-workout-website/pull/1). The coach uses Kokoro-82M through the optional, pinned `sherpa-onnx-node@1.13.8` runtime. There is one selected voice at a time: Heart, Bella, Michael, Puck or Emma.

## Why this runtime

The reviews agreed on Kokoro for a CPU server with several English voices. One review identified Sherpa as a smaller runtime for the same model. Both runtimes were installed and tested on this Linux x64 Xeon environment:

| Check | Sherpa 1.13.8 | kokoro-js 1.2.1 |
|---|---:|---:|
| Installed npm packages | 32 MB | 737 MB |
| Process memory after one cue | 307 MB | 414 MB |
| Cold model load in this test | 7.2 s | 16.3 s |
| Generation of the same short sentence | 24.6 s | 37.9 s |

These are measurements from this environment, without GPU acceleration. They are not latency promises for another computer. A second Sherpa check while other tests ran took 11 seconds to load and 29 seconds to generate. The slow cold generation makes preparation and caching necessary. Serving the cached WAV through the local API took about 26 milliseconds in a separate check.

The model is [Kokoro v1.0 int8 packaged by Sherpa](https://k2-fsa.github.io/sherpa/onnx/tts/pretrained_models/kokoro.html), with a pinned archive SHA-256. The 132 MB archive expands to about 183 MB; the Linux native runtime adds 32 MB. The main app has no new mandatory dependency. Python, CUDA, a second engine, voice cloning and rep counting are outside this feature.

## Install and isolation

Use **Download local voice** in Settings or the guided Coach popup, or run `npm run voice:install`. Installation uses its own package and lockfile in `voice/`. It verifies the model archive, extracts it with `tar`, and generates a test cue before writing `.voice/ready.json`. Failed installation leaves the workout usable and reports a retry message. No model downloads happen during ordinary `npm install` or on the first spoken cue.

Native inference runs in a child process with two CPU threads. The launcher sets the native library path for that process, so the systemd unit needs no changes. The process exits after two minutes without generation work. A crash or missing runtime leaves the Node server and workout saves running.

Kokoro and Sherpa are Apache-2.0 projects. Their licences remain with the installed model and npm packages. The source references are the [Kokoro voice card](https://huggingface.co/hexgrad/Kokoro-82M/blob/main/VOICES.md) and [Sherpa's Node addon](https://github.com/k2-fsa/sherpa-onnx/tree/master/nodejs-addon-examples). Voice grades describe training data and cannot replace listening on the user's speakers.

## Script and playback

`public/js/voice/script.js` is shared by Node and the browser. It reads the personalised dose rather than the logger's `parseRx` heuristic. A pair of dumbbells remains equipment; minute prescriptions do not become sets. Tempo, per-side wording, ranges and technique clauses stay in the dose. The server accepts known exercise IDs, enum choices and bounded numeric values, then creates the spoken lines itself. There is no endpoint accepting arbitrary speech text.

Exercise introductions include the name and dose. Relevant stop and pain instructions are repeated on entry. Repeated paired exercises get the set number. During guided rests, one form sentence is offered at steady pace when its decoded duration fits before the last ten seconds. Typing cancels teaching but keeps clock cues available. A sufficiently long final rest can preview the next movement. Logging on Today does not start rest coaching.

Interval, hold and cardio timers use the same player. Holds say first side and other side; recovery and cardio say their exact duration. Long phases can announce halfway, one minute, thirty seconds and ten seconds. Beeps keep the final three seconds. Timer preparation has a **Start without waiting** button.

The browser fetches and decodes clips ahead of playback. Clock cues interrupt teaching and never wait for a network fetch or synthesis. A late cue is skipped. Back, Skip, Done, next, exit, timer pause/stop, video selection/play and voice-off cancel speech. The browser's old `speechSynthesis` path has been removed, so there is no mid-session change to an operating-system voice.

Radio ducking follows actual playback, including previews: volume is multiplied by 0.12 while speaking and restored on finish, cancellation or failure. Changing volume while ducked updates the underlying preference. The mute flag is independent. On browsers that lock media volume, the radio is temporarily muted during speech instead. This fallback still needs a listening check on physical devices.

Audio cache keys include model hash, runtime, voice, speed and exact text. The disk cache is outside `data/` and capped at 256 MB. Browser buffers and prepared server cue IDs also have bounds. Old profile fields and logs are read as before; voice preferences add optional settings.

## Verification

The automated checks cover all plan and add-on prescriptions at every level in metric and imperial, difficult dose strings, easier choices, safety cues, side changes, clock thresholds, request validation, cache-key changes, cancellation while decoding, clock priority and voice independent of beeps. Browser checks use sample profiles and controlled audio to check Settings, the guided controls, radio volume restoration, rest interactions, mobile layout and interval pause/stop. A real native cue was also generated and served as PCM WAV.

Physical iOS/Android audio permissions, locked-screen playback, subjective voice quality and native installation on Windows/macOS have not been verified. Browser timers can be throttled in the background; keep the workout visible for timed guidance.
