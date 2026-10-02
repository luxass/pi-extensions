import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

import satori from "satori";

import { BtwCover, metadata as btwMetadata } from "./BtwCover.tsx";
import { loadFonts } from "./fonts.ts";
import { metadata as voiceMetadata, VoiceCover } from "./VoiceCover.tsx";
import { metadata as whimsicalMetadata, WhimsicalCover } from "./WhimsicalCover.tsx";

const fonts = await loadFonts();
const covers = [
  { metadata: btwMetadata, element: <BtwCover /> },
  { metadata: voiceMetadata, element: <VoiceCover /> },
  { metadata: whimsicalMetadata, element: <WhimsicalCover /> },
];

for (const { metadata, element } of covers) {
  const svg = await satori(element, { width: 1280, height: 800, fonts });
  const output = new URL(`../../../packages/${metadata.directory}/docs/cover.svg`, import.meta.url);
  await mkdir(new URL(".", output), { recursive: true });
  await writeFile(output, `${svg}\n`);
  process.stdout.write(`Generated ${fileURLToPath(output)}\n`);
}
