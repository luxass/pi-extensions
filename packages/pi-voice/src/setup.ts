import type { ExtensionUIContext } from "@earendil-works/pi-coding-agent";
import { listInputDevices, type InputDevice, type VoiceSettings } from "@luxass/agent-voice";

import { promptProfile } from "./profile";

/** An undefined result means cancellation, not selection of the system default. */
export async function promptInputDevice(
  ui: ExtensionUIContext,
  current?: InputDevice,
): Promise<{ inputDevice: InputDevice | undefined } | undefined> {
  const keep = current == null ? undefined : `Keep ${current.name}`;
  const selected = await ui.select("Voice input", [
    ...(keep == null ? [] : [keep]),
    "System default",
    "Choose input device",
  ]);
  if (selected == null) return undefined;
  if (selected === keep) return { inputDevice: current };
  if (selected === "System default") return { inputDevice: undefined };

  const devices = await listInputDevices();
  const picked = await ui.select(
    "Voice input device",
    devices.map((device) => device.name),
  );
  const inputDevice = devices.find((device) => device.name === picked);
  return inputDevice == null ? undefined : { inputDevice };
}

/** Collect a setup draft. The caller checks and saves it only after every dialog completes. */
export async function promptSetup(
  ui: ExtensionUIContext,
  settings?: VoiceSettings,
): Promise<VoiceSettings | undefined> {
  const profiles = settings?.profiles ?? {};
  const existing = Object.keys(profiles);
  let activeProfile: string;
  let nextProfiles = profiles;
  const selected =
    existing.length === 0
      ? "Create new profile"
      : await ui.select("Voice transcription", [
          ...existing.map((name) => `Use ${name}`),
          "Create new profile",
        ]);
  if (selected == null) return undefined;
  if (selected === "Create new profile") {
    const added = await promptProfile(ui, existing);
    if (added == null) return undefined;
    activeProfile = added.name;
    nextProfiles = { ...profiles, [added.name]: added.profile };
  } else {
    activeProfile = selected.slice("Use ".length);
  }
  const input = await promptInputDevice(ui, settings?.inputDevice);
  return input == null
    ? undefined
    : {
        ...settings,
        activeProfile,
        profiles: nextProfiles,
        inputDevice: input.inputDevice,
      };
}
