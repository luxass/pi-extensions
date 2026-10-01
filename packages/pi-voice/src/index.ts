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
  runDoctor,
  saveVoiceSettings,
  transcribe,
  type DoctorCheckId,
} from "@luxass/agent-voice";

import { pickLocalModel, promptProfile } from "./profile";

const SUBCOMMANDS = [
  { value: "record", description: "start/stop recording, transcribe on stop" },
  { value: "cancel", description: "discard the in-progress recording" },
  { value: "device", description: "select input device" },
  { value: "profile", description: "select transcription profile" },
  { value: "profile add", description: "create a transcription profile" },
  { value: "profile model", description: "change the active profile's model" },
  { value: "doctor", description: "check recording and transcription setup" },
  { value: "status", description: "show profile and input" },
];

const DOCTOR_FIXES: Partial<Record<DoctorCheckId, string>> = {
  device: "run /voice device",
  model: "run /voice profile model",
};

export default function voice(pi: ExtensionAPI) {
  const path = process.env.AGENT_VOICE_SETTINGS ?? join(getAgentDir(), "voice-settings.json");
  const settings = loadVoiceSettings(path);
  const recorder = createRecorder();

  function statusText(state = recorder.isRecording ? "● recording" : "ready"): string {
    const { name, transcription } = getActiveProfile(settings);
    const model =
      transcription.type === "api"
        ? transcription.model
        : basename(transcription.model ?? "auto model", ".bin");
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

  pi.registerCommand("voice", {
    description: "start/stop recording, or `/voice <subcommand>`",
    getArgumentCompletions: (prefix) => {
      const items = SUBCOMMANDS.filter(({ value }) => value.startsWith(prefix)).map(
        ({ value, description }) => ({ value, label: value, description }),
      );
      return items.length > 0 ? items : null;
    },
    handler: async (args, ctx) => {
      switch (args.trim().replaceAll(/\s+/gu, " ")) {
        case "":
        case "record": {
          await toggle(ctx);
          return;
        }

        case "cancel": {
          if (!recorder.isRecording) return;
          recorder.cancel();
          showStatus(ctx.ui);
          ctx.ui.notify("Recording discarded");
          return;
        }

        case "device": {
          if (recorder.isRecording) {
            ctx.ui.notify("Stop recording before changing the input", "warning");
            return;
          }
          const devices = await listInputDevices();
          const selected = await ctx.ui.select("Voice input device", [
            "System default",
            ...devices.map((device) => device.name),
          ]);
          if (selected == null) return;
          settings.inputDevice = devices.find((device) => device.name === selected);
          saveVoiceSettings(path, settings);
          showStatus(ctx.ui);
          ctx.ui.notify(`Voice input: ${selected}`);
          return;
        }

        case "profile": {
          if (!settings.profiles) {
            ctx.ui.notify("No profiles yet; run /voice profile add", "warning");
            return;
          }
          const selected = await ctx.ui.select(
            "Voice transcription profile",
            Object.keys(settings.profiles),
          );
          if (selected == null) return;
          settings.activeProfile = selected;
          saveVoiceSettings(path, settings);
          showStatus(ctx.ui);
          ctx.ui.notify(`Voice profile: ${selected}`);
          return;
        }

        case "profile add": {
          const added = await promptProfile(ctx.ui, Object.keys(settings.profiles ?? {}));
          if (!added) return;
          settings.profiles = { ...settings.profiles, [added.name]: added.profile };
          settings.activeProfile = added.name;
          saveVoiceSettings(path, settings);
          showStatus(ctx.ui);
          ctx.ui.notify(`Voice profile: ${added.name}`);
          return;
        }

        case "profile model": {
          const { name, transcription } = getActiveProfile(settings);
          const model =
            transcription.type === "api"
              ? (await ctx.ui.input(`Model for ${name}`, transcription.model))?.trim()
              : await pickLocalModel(ctx.ui);
          if (!model) return;
          transcription.model = model;
          // Without saved profiles the active profile is implicit; save it to keep the model.
          settings.profiles ??= { [name]: transcription };
          settings.activeProfile = name;
          saveVoiceSettings(path, settings);
          showStatus(ctx.ui);
          ctx.ui.notify(`Voice profile ${name}: ${model}`);
          return;
        }

        case "doctor": {
          const checks = await runDoctor(settings);
          const lines = checks.map(({ id, ok, detail, fix }) =>
            ok ? `✓ ${id}: ${detail}` : `✗ ${id}: ${detail} → ${DOCTOR_FIXES[id] ?? fix}`,
          );
          ctx.ui.notify(lines.join("\n"), checks.every(({ ok }) => ok) ? "info" : "warning");
          return;
        }

        case "status": {
          ctx.ui.notify(statusText());
          return;
        }

        default: {
          ctx.ui.notify(
            `Usage: /voice [${SUBCOMMANDS.map(({ value }) => value).join(" | ")}]`,
            "warning",
          );
        }
      }
    },
  });

  pi.on("session_start", (_event, ctx) => {
    showStatus(ctx.ui);
  });

  pi.on("session_shutdown", () => {
    recorder.cancel();
  });
}
