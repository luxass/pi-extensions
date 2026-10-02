import type { Font } from "satori";

const sources = [
  {
    name: "DM Sans",
    weight: 400,
    url: "https://fonts.gstatic.com/s/dmsans/v17/rP2tp2ywxg089UriI5-g4vlH9VoD8CmcqZG40F9JadbnoEwAopxhTg.ttf",
  },
  {
    name: "DM Sans",
    weight: 600,
    url: "https://fonts.gstatic.com/s/dmsans/v17/rP2tp2ywxg089UriI5-g4vlH9VoD8CmcqZG40F9JadbnoEwAfJthTg.ttf",
  },
  {
    name: "IBM Plex Mono",
    weight: 400,
    url: "https://fonts.gstatic.com/s/ibmplexmono/v20/-F63fjptAgt5VM-kVkqdyU8n5ig.ttf",
  },
] satisfies (Pick<Font, "name" | "weight"> & { url: string })[];

export function loadFonts(): Promise<Font[]> {
  return Promise.all(
    sources.map(async ({ name, weight, url }): Promise<Font> => {
      const response = await fetch(url);
      return { name, weight, style: "normal", data: await response.arrayBuffer() };
    }),
  );
}
