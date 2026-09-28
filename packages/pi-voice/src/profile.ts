import { basename } from "node:path";

import type { ExtensionUIContext } from "@earendil-works/pi-coding-agent";
import { discoverLocalModels, type TranscriptionProfile } from "@luxass/agent-voice";

const AUTO_MODEL = "Auto-detect when transcribing";

async function promptLocal(ui: ExtensionUIContext): Promise<TranscriptionProfile | undefined> {
  const models = discoverLocalModels();
  const picked = await ui.select("Whisper model", [
    AUTO_MODEL,
    ...models.map((model) => basename(model)),
  ]);
  if (picked === undefined) return undefined;
  const language = await ui.input("Language code (blank for auto)", "en");
  if (language === undefined) return undefined;

  const profile: TranscriptionProfile = { type: "local" };
  const model = models.find((candidate) => basename(candidate) === picked);
  if (model) profile.model = model;
  if (language.trim()) profile.language = language.trim();
  return profile;
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
  if (apiKeyEnv === undefined) return undefined;
  const format = await ui.select("Request format", ["multipart", "openrouter"]);
  if (format !== "multipart" && format !== "openrouter") return undefined;

  const profile: TranscriptionProfile = { type: "api", endpoint, model, format };
  if (apiKeyEnv.trim()) profile.apiKeyEnv = apiKeyEnv.trim();
  return profile;
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
  const profile =
    type === "local" ? await promptLocal(ui) : type === "api" ? await promptApi(ui) : undefined;
  return profile && { name, profile };
}
