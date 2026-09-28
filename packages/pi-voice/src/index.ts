import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";

import {
  getAgentDir,
  type ExtensionAPI,
  type ExtensionContext,
} from "@earendil-works/pi-coding-agent";
import { Key } from "@earendil-works/pi-tui";
import {
  createRecorder,
  defaultModel,
  listInputDevices,
  modelChoices,
  resolveOptions,
  resolvePreferredDevice,
  transcribe,
  transcriptionProfile,
  type VoiceConfig,
} from "@luxass/agent-voice";

function settingsPath() {
  return process.env.AGENT_VOICE_SETTINGS ?? join(getAgentDir(), "voice-settings.json");
}

function loadSettings() {
  const path = settingsPath();
  return resolveOptions(
    existsSync(path) ? (JSON.parse(readFileSync(path, "utf8")) as Record<string, unknown>) : {},
  );
}

function saveSettings(config: VoiceConfig) {
  writeFileSync(settingsPath(), `${JSON.stringify(config, null, 2)}\n`);
}

export default function voice(pi: ExtensionAPI) {
  const config = loadSettings();

  let recordingUI: ExtensionContext["ui"];
  const recorder = createRecorder({
    onError: (error) => {
      recordingUI.notify(`Recording failed: ${error.message}`, "error");
    },
  });
  let activeInput = "system default";

  async function toggle(ctx: ExtensionContext): Promise<void> {
    if (!recorder.isRecording) {
      const { device, warning } =
        config.input === ""
          ? { device: undefined, warning: undefined }
          : resolvePreferredDevice(await listInputDevices(), config.input);
      if (warning !== undefined) ctx.ui.notify(warning, "warning");
      recordingUI = ctx.ui;
      recorder.start(device);
      activeInput = device?.name ?? "system default";
      ctx.ui.notify(`Recording from ${activeInput}… run again to transcribe`);
      return;
    }

    const recordingFile = await recorder.stop();
    try {
      const text = await transcribe(
        recordingFile,
        transcriptionProfile(config, config.activeTranscription),
      );
      ctx.ui.pasteToEditor(text);
      ctx.ui.notify("Transcription pasted into the composer", "info");
    } finally {
      recorder.discard(recordingFile);
    }
  }

  pi.registerShortcut(Key.ctrlAlt("v"), {
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
      ctx.ui.notify("Recording cancelled");
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
      const names = ["System default", ...devices.map((device) => device.name)];
      const selected = await ctx.ui.select("Test voice input device", names);
      if (selected === undefined) return;

      const device = devices.find((device) => device.name === selected);
      const nextInput = selected === "System default" ? "" : device?.id;
      if (nextInput === undefined) return;
      config.input = nextInput;
      saveSettings(config);
      ctx.ui.notify(`Voice input: ${device?.name ?? "system default"}`);
    },
  });
  pi.registerCommand("voice-model", {
    description: "select transcription model",
    handler: async (_args, ctx) => {
      if (recorder.isRecording) {
        ctx.ui.notify("Stop recording before changing the model", "warning");
        return;
      }

      const entries = Object.entries(config.transcriptions).flatMap(([profile, transcription]) => {
        const prefix = `${profile} · `;
        if (transcription.type === "api") {
          return transcription.models.map((model) => ({
            title: `${prefix}${model}`,
            profile,
            model,
          }));
        }

        return modelChoices(transcription).map((choice) => ({
          title: `${prefix}${choice.title}`,
          profile,
          model: choice.value,
        }));
      });

      const selected = await ctx.ui.select(
        "Test transcription model",
        entries.map((entry) => entry.title),
      );
      const entry = entries.find((entry) => entry.title === selected);
      if (!entry) return;
      const transcription = transcriptionProfile(config, entry.profile);
      if (transcription.type === "api") {
        transcription.models = [
          entry.model,
          ...transcription.models.filter((model) => model !== entry.model),
        ];
      } else {
        transcription.model = entry.model;
      }

      config.activeTranscription = entry.profile;
      saveSettings(config);
      ctx.ui.notify(`Voice backend: ${entry.title}`);
    },
  });

  pi.registerCommand("voice-status", {
    description: "show model and input",
    handler: async (_args, ctx) => {
      const source = recorder.isRecording ? activeInput : config.input || "system default";
      const model = defaultModel(transcriptionProfile(config, config.activeTranscription));
      ctx.ui.notify(
        `${recorder.isRecording ? "Recording" : "Ready"} · ${config.activeTranscription} · ${basename(model)} · ${source}`,
      );
    },
  });

  pi.on("session_shutdown", () => {
    recorder.cancel();
  });
}
