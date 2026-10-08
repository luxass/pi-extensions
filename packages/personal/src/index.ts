import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

export default function personal(pi: ExtensionAPI) {
  pi.on("session_start", (_, ctx) => {
    ctx.ui.notify("Personal extension activated.");
  });
}
