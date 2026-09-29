# @luxass/pi-voice

Record speech and paste the transcription into [Pi](https://github.com/badlogic/pi-mono)'s composer.

## Install

```sh
pi install npm:@luxass/pi-voice
```

Recording requires `sox` on your `PATH`. For local transcription, you also need `whisper-cli` and a compatible Whisper model. Alternatively, add an API transcription profile; that does not require a local Whisper installation.

## Use

Press **Ctrl+Shift+V** or run `/voice-record` to start recording. Press it again to stop, transcribe, and paste the result into the composer. The extension does not send your message for you.

| Command                | Purpose                                         |
| ---------------------- | ----------------------------------------------- |
| `/voice-record`        | Start or stop recording and transcribe on stop. |
| `/voice-cancel`        | Discard the current recording.                  |
| `/voice-device`        | Choose an input device or the system default.   |
| `/voice-profile add`   | Create a local or API transcription profile.    |
| `/voice-profile`       | Switch between saved profiles.                  |
| `/voice-profile model` | Change the active API profile's model.          |
| `/voice-status`        | Show the current profile and input device.      |

Without a saved profile, transcription uses automatic local model discovery. For API transcription, `/voice-profile add` asks for the endpoint, model, request format, and **name of an environment variable** holding the API key. Keep the key in your environment, not in the settings file.

Settings are saved to Pi's agent directory as `voice-settings.json`. Set `AGENT_VOICE_SETTINGS` to use a different settings file.
