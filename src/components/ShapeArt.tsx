import { useId } from "react";

// Ilustracje w stylu DiceBear Shapes (CC0) z design systemu: kilka dużych kształtów na gradiencie
// brzoskwinia → róż, kolory tylko z palety. Ten sam seed daje zawsze ten sam obrazek.

const SHAPE_CLASSES = ["sw-art-navy", "sw-art-sky", "sw-art-orange", "sw-art-cream"];

/** Prosty, deterministyczny generator liczb (mulberry32) z ziarnem z tekstu. */
function random(seed: string): () => number {
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return () => {
    h = (h + 0x6d2b79f5) | 0;
    let t = Math.imul(h ^ (h >>> 15), 1 | h);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface Props {
  seed: string;
  width: number;
  height: number;
  className?: string;
  /** Opis dla czytnika ekranu; bez niego obrazek jest dekoracyjny. */
  label?: string;
}

export function ShapeArt({ seed, width, height, className, label }: Props) {
  const gradientId = useId();
  const rnd = random(seed);
  const pick = <T,>(items: T[]) => items[Math.floor(rnd() * items.length)];
  const size = Math.min(width, height);
  // Kolejność kolorów bez powtórzeń, żeby kształty się od siebie odróżniały.
  const colors = [...SHAPE_CLASSES].sort(() => rnd() - 0.5);

  const shapes = [0, 1, 2].map((i) => {
    const cx = width * (0.15 + rnd() * 0.7);
    const cy = height * (0.15 + rnd() * 0.7);
    const r = size * (0.22 + rnd() * 0.22);
    const rotate = Math.round(rnd() * 60 - 30);
    const cls = colors[i];
    switch (pick(["circle", "square", "triangle"])) {
      case "circle":
        return <circle key={i} cx={cx} cy={cy} r={r} className={cls} />;
      case "square":
        return (
          <rect key={i} x={cx - r} y={cy - r} width={r * 2} height={r * 2} className={cls} transform={`rotate(${rotate} ${cx} ${cy})`} />
        );
      default:
        return (
          <polygon
            key={i}
            points={`${cx},${cy - r} ${cx + r},${cy + r} ${cx - r},${cy + r}`}
            className={cls}
            transform={`rotate(${rotate} ${cx} ${cy})`}
          />
        );
    }
  });
  const flip = rnd() > 0.5;

  return (
    <svg
      className={className}
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="xMidYMid slice"
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      <defs>
        <linearGradient id={gradientId} x1={flip ? 1 : 0} y1="0" x2={flip ? 0 : 1} y2="1">
          <stop offset="0" className="sw-art-bg-a" />
          <stop offset="1" className="sw-art-bg-b" />
        </linearGradient>
      </defs>
      <rect width={width} height={height} fill={`url(#${gradientId})`} />
      {shapes}
    </svg>
  );
}
