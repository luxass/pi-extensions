export function Cursor({ color, height = 18 }: { color: string; height?: number }) {
  return <div style={{ display: "flex", width: 1.5, height, background: color }} />;
}
