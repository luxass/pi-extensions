export function Dot({ color, size = 6 }: { color: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 6 6">
      <circle cx="3" cy="3" r="2.5" fill={color} />
    </svg>
  );
}
