type Props = {
  data: number[];
  width?: number;
  height?: number;
};

export function Sparkline({ data, width = 260, height = 60 }: Props) {
  if (data.length === 0) return null;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const stepX = width / (data.length - 1);

  const points = data.map((v, i) => {
    const x = i * stepX;
    const y = height - ((v - min) / range) * (height - 8) - 4;
    return [x, y] as const;
  });

  const path = 'M ' + points.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' L ');

  const area =
    `M ${points[0][0]},${height} ` +
    points.map(([x, y]) => `L ${x.toFixed(1)},${y.toFixed(1)}`).join(' ') +
    ` L ${points[points.length - 1][0]},${height} Z`;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} width="100%" height={height} preserveAspectRatio="none">
      <path d={area} fill="var(--color-accent-soft)" />
      <path d={path} fill="none" stroke="var(--color-accent)" strokeWidth={1.5} />
      {points.map(([x, y], i) => (
        <circle
          key={i}
          cx={x}
          cy={y}
          r={i === points.length - 1 ? 3 : 1.5}
          fill="var(--color-accent)"
        />
      ))}
    </svg>
  );
}
