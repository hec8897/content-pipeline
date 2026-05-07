import type { Channel } from "@/lib/types";

type Props = {
  channel: Channel;
  size?: number;
};

export function ChannelIcon({ channel, size = 22 }: Props) {
  const style: React.CSSProperties = {
    width: size,
    height: size,
    fontSize: size * 0.5,
    flexShrink: 0,
  };

  if (channel === "naver") {
    return (
      <span
        style={style}
        className="rounded inline-flex items-center justify-center font-bold text-white bg-naver"
      >
        N
      </span>
    );
  }

  return (
    <span
      style={{
        ...style,
        background:
          "linear-gradient(135deg, #f58529 0%, #dd2a7b 50%, #8134af 100%)",
      }}
      className="rounded inline-flex items-center justify-center font-bold text-white"
    >
      ◯
    </span>
  );
}
