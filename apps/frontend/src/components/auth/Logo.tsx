export function Logo({ size = 30 }: { size?: number }) {
  return (
    <div
      className="flex items-center justify-center rounded-lg"
      style={{
        width: size,
        height: size,
        background: "linear-gradient(135deg, var(--color-accent), #8a8af0)",
      }}
    >
      <svg
        viewBox="0 0 16 16"
        width={Math.round(size * 0.53)}
        height={Math.round(size * 0.53)}
        fill="none"
      >
        <path
          d="M3 4 L8 8 L13 4"
          stroke="white"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M3 8 L8 12 L13 8"
          stroke="white"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.6"
        />
      </svg>
    </div>
  );
}
