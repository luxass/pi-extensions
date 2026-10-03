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
  loadVoiceSettings,
  runDoctor,
  saveVoiceSettings,
  transcribe,
  type DoctorCheck,
  type DoctorCheckId,
  type VoiceSettings,
} from "@luxass/agent-voice";

import { pickLocalModel, promptProfile } from "./profile";
import { promptInputDevice, promptSetup } from "./setup";

const SUBCOMMANDS = [
  { value: "record", description: "start/stop recording, transcribe on stop" },
  { value: "cancel", description: "discard the in-progress recording" },
  { value: "setup", description: "configure transcription and input, then check requirements" },
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

function formatChecks(checks: DoctorCheck[]): string {
  return checks
    .map(({ id, ok, detail, fix }) =>
      ok ? `✓ ${id}: ${detail}` : `✗ ${id}: ${detail} → ${DOCTOR_FIXES[id] ?? fix}`,
    )
    .join("\n");
}

function statusText(settings: VoiceSettings, state = "idle"): string {
  const { name, transcription } = getActiveProfile(settings);
  const model =
    transcription.type === "api"
      ? transcription.model
      : basename(transcription.model ?? "auto model", ".bin");
  return `voice ${state} · ${name} · ${model} · ${settings.inputDevice?.name ?? "system default"}`;
}

export default function voice(pi: ExtensionAPI) {
  const path = process.env.AGENT_VOICE_SETTINGS ?? join(getAgentDir(), "voice-settings.json");
  let configuration = loadVoiceSettings(path);
  const recorder = createRecorder();
  let recording: VoiceSettings | undefined;

  function setupMessage(): string {
    return [
      "Voice needs setup. Run /voice setup.",
      ...configuration.errors.map(({ path, message }) => `${path}: ${message}`),
    ].join("\n");
  }

  function save(settings: VoiceSettings): void {
    saveVoiceSettings(path, settings);
    configuration = { settings, errors: [] };
  }

  function showStatus(ui: ExtensionContext["ui"], settings: VoiceSettings, state?: string): void {
    ui.setStatus("voice", statusText(settings, state ?? (recording ? "● recording" : "idle")));
  }

  async function setup(ctx: ExtensionContext): Promise<void> {
    if (!ctx.hasUI) {
      ctx.ui.notify("Run /voice setup in an interactive Pi session", "info");
      return;
    }
    if (recording) {
      ctx.ui.notify("Stop recording before running setup", "warning");
      return;
    }

    const draft = await promptSetup(ctx.ui, configuration.settings);
    if (draft == null) return;
    const checks = await runDoctor(draft);
    save(draft);
    const ready = checks.every(({ ok }) => ok);
    showStatus(ctx.ui, draft, ready ? "ready" : "needs setup");
    ctx.ui.notify(
      ready
        ? "Voice is ready. Press Ctrl+Shift+V or run /voice to record."
        : `Voice profile saved. Finish these requirements before recording:\n${formatChecks(checks.filter(({ ok }) => !ok))}`,
      ready ? "info" : "warning",
    );
  }

  async function offerSetup(ctx: ExtensionContext, message: string): Promise<void> {
    ctx.ui.notify(message, configuration.errors.length > 0 ? "warning" : "info");
    if (ctx.hasUI && (await ctx.ui.confirm("Voice needs setup", "Open voice setup now?"))) {
      await setup(ctx);
    }
  }

  // Pi reports recording, transcription and save errors from these handlers.
  async function toggle(ctx: ExtensionContext): Promise<void> {
    if (recording) {
      const active = recording;
      showStatus(ctx.ui, active, "transcribing…");
      try {
        const file = await recorder.stop();
        try {
          const text = await transcribe(file, getActiveProfile(active).transcription);
          ctx.ui.pasteToEditor(text);
          ctx.ui.notify("Transcription pasted into the composer", "info");
        } finally {
          recorder.discard(file);
        }
      } finally {
        recording = undefined;
        showStatus(ctx.ui, active);
      }
      return;
    }

    const { settings } = configuration;
    if (!settings) {
      await offerSetup(ctx, setupMessage());
      return;
    }
    const checks = await runDoctor(settings);
    if (checks.some(({ ok }) => !ok)) {
      await offerSetup(ctx, formatChecks(checks.filter(({ ok }) => !ok)));
      return;
    }

    const active = structuredClone(settings);
    recorder.start(active.inputDevice, (error) => {
      recording = undefined;
      showStatus(ctx.ui, active);
      ctx.ui.notify(`Recording failed: ${error.message}`, "error");
    });
    recording = active;
    showStatus(ctx.ui, active);
    ctx.ui.notify(
      `Recording from ${active.inputDevice?.name ?? "system default"}… run again to transcribe`,
    );
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
      const command = args.trim().replaceAll(/\s+/gu, " ");
      switch (command) {
        case "":
        case "record": {
          await toggle(ctx);
          return;
        }
        case "cancel": {
          if (!recording) return;
          const active = recording;
          recorder.cancel();
          recording = undefined;
          showStatus(ctx.ui, active);
          ctx.ui.notify("Recording discarded");
          return;
        }
        case "setup": {
          await setup(ctx);
          return;
        }
      }

      const { settings } = configuration;
      if (!settings) {
        ctx.ui.notify(setupMessage(), configuration.errors.length > 0 ? "warning" : "info");
        return;
      }
      switch (command) {
        case "device": {
          if (recording) {
            ctx.ui.notify("Stop recording before changing the input", "warning");
            return;
          }
          const selected = await promptInputDevice(ctx.ui, settings.inputDevice);
          if (selected == null) return;
          settings.inputDevice = selected.inputDevice;
          save(settings);
          showStatus(ctx.ui, settings);
          ctx.ui.notify(`Voice input: ${selected.inputDevice?.name ?? "system default"}`);
          return;
        }

        case "profile": {
          const selected = await ctx.ui.select(
            "Voice transcription profile",
            Object.keys(settings.profiles),
          );
          if (selected == null) return;
          settings.activeProfile = selected;
          save(settings);
          showStatus(ctx.ui, settings);
          ctx.ui.notify(`Voice profile: ${selected}`);
          return;
        }

        case "profile add": {
          const added = await promptProfile(ctx.ui, Object.keys(settings.profiles));
          if (!added) return;
          settings.profiles = { ...settings.profiles, [added.name]: added.profile };
          settings.activeProfile = added.name;
          save(settings);
          showStatus(ctx.ui, settings);
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
          save(settings);
          showStatus(ctx.ui, settings);
          ctx.ui.notify(`Voice profile ${name}: ${model}`);
          return;
        }

        case "doctor": {
          const checks = await runDoctor(settings);
          ctx.ui.notify(formatChecks(checks), checks.every(({ ok }) => ok) ? "info" : "warning");
          return;
        }

        case "status": {
          ctx.ui.notify(statusText(recording ?? settings, recording ? "● recording" : "idle"));
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
    const { settings } = configuration;
    if (settings) showStatus(ctx.ui, settings);
    else ctx.ui.setStatus("voice", "voice needs setup · /voice setup");
    if (configuration.errors.length > 0) ctx.ui.notify(setupMessage(), "warning");
  });

  pi.on("session_shutdown", () => {
    recorder.cancel();
    recording = undefined;
  });
}
