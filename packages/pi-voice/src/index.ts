import { basename, join } from "node:path";

import {
  getAgentDir,
  type ExtensionAPI,
  type ExtensionContext,
} from "@earendil-works/pi-coding-agent";
import { Key } from "@earendil-works/pi-tui";
import {
  createRecorder,
  getActiveProfile,
  listInputDevices,
  loadVoiceSettings,
  saveVoiceSettings,
  transcribe,
} from "@luxass/agent-voice";

import { promptProfile } from "./profile";

export default function voice(pi: ExtensionAPI) {
  const path = process.env.AGENT_VOICE_SETTINGS ?? join(getAgentDir(), "voice-settings.json");
  const settings = loadVoiceSettings(path);
  const recorder = createRecorder();

  function statusText(state = recorder.isRecording ? "● recording" : "ready"): string {
    const { name, transcription } = getActiveProfile(settings);
    const model =
      transcription.type === "api"
        ? transcription.model
        : transcription.model === undefined
          ? "auto model"
          : basename(transcription.model, ".bin");
    return `voice ${state} · ${name} · ${model} · ${settings.inputDevice?.name ?? "system default"}`;
  }

  function showStatus(ui: ExtensionContext["ui"], state?: string): void {
    ui.setStatus("voice", statusText(state));
  }

  // Errors thrown from command and shortcut handlers are reported by Pi.
  async function toggle(ctx: ExtensionContext): Promise<void> {
    if (!recorder.isRecording) {
      recorder.start(settings.inputDevice, (error) => {
        showStatus(ctx.ui);
        ctx.ui.notify(`Recording failed: ${error.message}`, "error");
      });
      showStatus(ctx.ui);
      ctx.ui.notify(
        `Recording from ${settings.inputDevice?.name ?? "system default"}… run again to transcribe`,
      );
      return;
    }

    showStatus(ctx.ui, "transcribing…");
    try {
      const file = await recorder.stop();
      try {
        const text = await transcribe(file, getActiveProfile(settings).transcription);
        ctx.ui.pasteToEditor(text);
        ctx.ui.notify("Transcription pasted into the composer", "info");
      } finally {
        recorder.discard(file);
      }
    } finally {
      showStatus(ctx.ui);
    }
  }

  pi.registerShortcut(Key.ctrlShift("v"), {
    description: "record/transcribe into the composer",
    handler: toggle,
  });

  pi.registerCommand("voice-record", {
    description: "start/stop recording, transcribe on stop",
    handler: (_args, ctx) => toggle(ctx),
  });

  pi.registerCommand("voice-cancel", {
    description: "discard the in-progress recording",
    // oxlint-disable-next-line require-await
    handler: async (_args, ctx) => {
      if (!recorder.isRecording) return;
      recorder.cancel();
      showStatus(ctx.ui);
      ctx.ui.notify("Recording discarded");
    },
  });

  pi.registerCommand("voice-device", {
    description: "select input device",
    handler: async (_args, ctx) => {
      if (recorder.isRecording) {
        ctx.ui.notify("Stop recording before changing the input", "warning");
        return;
      }
      const devices = await listInputDevices();
      const selected = await ctx.ui.select("Voice input device", [
        "System default",
        ...devices.map((device) => device.name),
      ]);
      if (selected === undefined) return;
      const device = devices.find((candidate) => candidate.name === selected);
      if (device) settings.inputDevice = device;
      else delete settings.inputDevice;
      saveVoiceSettings(path, settings);
      showStatus(ctx.ui);
      ctx.ui.notify(`Voice input: ${selected}`);
    },
  });

  pi.registerCommand("voice-profile", {
    description: "select transcription profile, `add` one, or change the API `model`",
    getArgumentCompletions: (prefix) => {
      const items = [
        { value: "add", label: "add", description: "create a transcription profile" },
        { value: "model", label: "model", description: "change the active API profile's model" },
      ].filter((item) => item.value.startsWith(prefix));
      return items.length > 0 ? items : null;
    },
    handler: async (args, ctx) => {
      const subcommand = args.trim();
      if (subcommand === "model") {
        const { name, transcription } = getActiveProfile(settings);
        if (transcription.type !== "api") {
          ctx.ui.notify(`${name} is a local profile; switch profiles to change models`, "warning");
          return;
        }
        const model = (await ctx.ui.input(`Model for ${name}`, transcription.model))?.trim();
        if (!model) return;
        transcription.model = model;
        saveVoiceSettings(path, settings);
        showStatus(ctx.ui);
        ctx.ui.notify(`Voice profile ${name}: ${model}`);
        return;
      }
      if (subcommand === "add") {
        const added = await promptProfile(ctx.ui, Object.keys(settings.profiles ?? {}));
        if (!added) return;
        settings.profiles = { ...settings.profiles, [added.name]: added.profile };
        settings.activeProfile = added.name;
        saveVoiceSettings(path, settings);
        showStatus(ctx.ui);
        ctx.ui.notify(`Voice profile: ${added.name}`);
        return;
      }
      if (!settings.profiles) {
        ctx.ui.notify("No profiles yet; run /voice-profile add", "warning");
        return;
      }
      const selected = await ctx.ui.select(
        "Voice transcription profile",
        Object.keys(settings.profiles),
      );
      if (selected === undefined) return;
      settings.activeProfile = selected;
      saveVoiceSettings(path, settings);
      showStatus(ctx.ui);
      ctx.ui.notify(`Voice profile: ${selected}`);
    },
  });

  pi.registerCommand("voice-status", {
    description: "show profile and input",
    // oxlint-disable-next-line require-await
    handler: async (_args, ctx) => {
      ctx.ui.notify(statusText());
    },
  });

  pi.on("session_start", (_event, ctx) => {
    showStatus(ctx.ui);
  });

  pi.on("session_shutdown", () => {
    recorder.cancel();
  });
}
