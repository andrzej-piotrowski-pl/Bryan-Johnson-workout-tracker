# Shared coach recordings

Each voice has a JSON index and a folder of individually compressed PCM WAV clips. The index includes the spoken text and each file's SHA-256 checksum. Filenames depend on the text, voice and model, so changing one sentence replaces only affected clips.

The recordings cover all training levels, metric and imperial instructions, add-ons, easier alternatives and timer choices. Personal weights and heart-rate targets stay on screen. The build reads the public plan, never a user's profile or workout logs.

Use **Actions → Build shared coach voices** to update recordings. The build reuses these files and generates only missing clips. Replace each voice folder and its JSON index with the corresponding build artifact, then run the voice checks, then commit the changed files with the version bump and changelog.

Do not publish a copy of `.voice/`: older local caches can contain personalised speech. Use the shared builder described in [the implementation notes](../../docs/GUIDED-VOICE.md).
