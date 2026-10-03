---
"@luxass/pi-voice": minor
---

Add `/voice setup` to choose a transcription profile and microphone, and check recording requirements before starting capture. Offer setup when configuration is missing or unusable. Completing setup does not start recording.

Load settings once at extension startup and update them in memory after saving. Display settings diagnostics without preventing the extension from loading. Validate known settings while allowing extra keys without warnings.
