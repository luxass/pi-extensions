import type { ExtensionUIContext } from "@earendil-works/pi-coding-agent";
import {
  downloadModel,
  listLocalModels,
  type LocalModel,
  type TranscriptionProfile,
} from "@luxass/agent-voice";

const label = ({ name, installed, approxMB }: LocalModel) =>
  installed ? name : `Download ${name} (${approxMB} MB)`;

function download(ui: ExtensionUIContext, name: string): Promise<string> {
  let shown = -1;
  return downloadModel(name, {
    // Without a Content-Length, treat what arrived as the whole file.
    onProgress: (received, total = received) => {
      const percent = Math.floor((received / total) * 100);
      if (percent === shown) return;
      shown = percent;
      ui.setStatus("voice-download", `downloading ${name}… ${percent}%`);
    },
  }).finally(() => {
    ui.setStatus("voice-download", undefined);
  });
}

/** Pick an installed model, or one from the curated list, which is downloaded right away. */
export async function pickLocalModel(ui: ExtensionUIContext): Promise<string | undefined> {
  const models = listLocalModels();
  const picked = await ui.select(
    "Whisper model",
    models.map((model) => label(model)),
  );
  const model = models.find((candidate) => label(candidate) === picked);
  return model == null || model.installed ? model?.path : download(ui, model.name);
}

async function promptLocal(ui: ExtensionUIContext): Promise<TranscriptionProfile | undefined> {
  const model = await pickLocalModel(ui);
  if (model == null) return undefined;
  const language = await ui.input("Language code (blank for auto)", "en");
  if (language == null) return undefined;
  return { type: "local", model, language: language.trim() || undefined };
}

async function promptApi(ui: ExtensionUIContext): Promise<TranscriptionProfile | undefined> {
  const endpoint = (await ui.input("API endpoint", "https://api.openai.com/v1"))?.trim();
  if (!endpoint) return undefined;
  const model = (await ui.input("Model", "whisper-1"))?.trim();
  if (!model) return undefined;
  const apiKeyEnv = await ui.input(
    "API key environment variable (blank for none)",
    "OPENAI_API_KEY",
  );
  if (apiKeyEnv == null) return undefined;
  const format = await ui.select("Request format", ["multipart", "openrouter"]);
  if (format == null) return undefined;
  return {
    type: "api",
    endpoint,
    model,
    format: format === "openrouter" ? "openrouter" : "multipart",
    apiKeyEnv: apiKeyEnv.trim() || undefined,
  };
}

/** Ask for a profile name and its transcription settings. Returns undefined when the user backs out. */
export async function promptProfile(
  ui: ExtensionUIContext,
  existing: readonly string[],
): Promise<{ name: string; profile: TranscriptionProfile } | undefined> {
  const name = (await ui.input("Profile name", "e.g. local, groq"))?.trim();
  if (!name) return undefined;
  if (existing.includes(name) && !(await ui.confirm("Replace profile", `Replace "${name}"?`)))
    return undefined;

  const type = await ui.select("Transcription", ["local", "api"]);
  if (type == null) return undefined;
  const profile = type === "local" ? await promptLocal(ui) : await promptApi(ui);
  return profile && { name, profile };
}
