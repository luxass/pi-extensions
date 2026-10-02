export function Waveform({ heights, color }: { heights: readonly number[]; color: string }) {
  return (
    <div
      style={{
        display: "flex",
        height: 90,
        alignItems: "center",
        justifyContent: "space-between",
        opacity: 0.7,
      }}
    >
      {heights.map((height, index) => (
        <div
          key={index}
          style={{
            display: "flex",
            width: 3,
            height: height * 0.7,
            borderRadius: 1.5,
            background: color,
          }}
        />
      ))}
    </div>
  );
}
