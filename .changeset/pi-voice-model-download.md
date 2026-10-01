---
"@luxass/pi-voice": minor
---

Local profiles can download a Whisper model straight from their model picker, in `/voice-profile add` and `/voice-profile model`. Add `/voice-doctor` to check recording and transcription setup. Models are now looked up only in `~/.cache/whisper` (or `$AGENT_VOICE_MODEL_DIR`); models in `~/.local/share/whisper-cpp` are no longer auto-detected.
