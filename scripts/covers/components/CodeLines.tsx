import { muted } from "../theme.ts";

export function CodeLines({ widths }: { widths: readonly number[] }) {
  return (
    <div
      style={{ display: "flex", flexDirection: "column", paddingLeft: 22, gap: 12, opacity: 0.18 }}
    >
      {widths.map((width, index) => (
        <div key={index} style={{ display: "flex", width, height: 3, background: muted }} />
      ))}
    </div>
  );
}
