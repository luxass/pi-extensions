import type { CSSProperties, ReactNode } from "react";

import { border, surface } from "../theme.ts";

export function Panel({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        border: `1px solid ${border}`,
        borderRadius: 3,
        background: surface,
        ...style,
      }}
    >
      {children}
    </div>
  );
}
