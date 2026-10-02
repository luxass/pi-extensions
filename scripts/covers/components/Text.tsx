import { ink } from "../theme.ts";

interface TextProps {
  value: string;
  size?: number;
  fill?: string;
  opacity?: number;
}

export function Text({ value, size = 18, fill = ink, opacity = 1 }: TextProps) {
  return (
    <div
      style={{
        display: "flex",
        fontFamily: "IBM Plex Mono",
        fontSize: size,
        lineHeight: 1.5,
        color: fill,
        opacity,
      }}
    >
      {value}
    </div>
  );
}
