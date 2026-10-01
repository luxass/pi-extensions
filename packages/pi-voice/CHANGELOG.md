# @luxass/pi-voice

## 0.2.0

### Minor Changes

- [`7254dbb`](https://github.com/luxass/pi-extensions/commit/7254dbb70440bea8a66c06c19fdecb4df65300c6) Thanks [@luxass](https://github.com/luxass)! - Local profiles can download a Whisper model straight from their model picker, in `/voice profile add` and `/voice profile model`. Add `/voice doctor` to check recording and transcription setup. Models are now looked up only in `~/.cache/whisper` (or `$AGENT_VOICE_MODEL_DIR`); models in `~/.local/share/whisper-cpp` are no longer auto-detected.

- [`c0065b9`](https://github.com/luxass/pi-extensions/commit/c0065b9af6507544528a0ac25c98ba248dd83328) Thanks [@luxass](https://github.com/luxass)! - Replace the `/voice-*` commands with one `/voice` command and subcommands: `/voice` (record), `/voice cancel`, `/voice device`, `/voice profile`, `/voice profile add`, `/voice profile model`, `/voice doctor` and `/voice status`. Subcommands autocomplete after `/voice `. The old `/voice-record`, `/voice-cancel`, `/voice-device`, `/voice-profile`, `/voice-doctor` and `/voice-status` commands are removed.

## 0.1.0

### Minor Changes

- [`5e5f736`](https://github.com/luxass/pi-extensions/commit/5e5f736ba8c9379985735148e4f349745fb3b1f2) Thanks [@luxass](https://github.com/luxass)! - Release voice recording and transcription with device selection and configurable profiles.
