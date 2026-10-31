// Tymczasowe logo „spacer” z design systemu Sunrise Walk (komponent Logo). Jeden kolor: currentColor.
// Do podmiany w jednym miejscu, gdy powstanie wersja docelowa. Min. szerokość: 64 px.
export function Logo({ width = 112, decorative = false }: { width?: number; decorative?: boolean }) {
  return (
    <svg
      className="logo"
      style={{ width: Math.max(width, 64) }}
      viewBox="-24 -24 671.6572412738697 172"
      role={decorative ? undefined : "img"}
      aria-label={decorative ? undefined : "spacer"}
      aria-hidden={decorative || undefined}
    >
      <g fill="none" stroke="currentColor" strokeLinecap="butt" strokeLinejoin="round">
        <path d="M 86.000 10.350 H 40 A 19.825 19.825 0 0 0 40 50 H 60 A 19.825 19.825 0 0 1 60 89.650 H 14.000" strokeWidth="20.700" transform="translate(-10.000 0)" />
        <path d="M 11.500 50 A 38.500 38.500 0 1 0 88.500 50 A 38.500 38.500 0 1 0 11.500 50" strokeWidth="23.000" transform="translate(88.000 0)" />
        <path d="M 12.500 0.000 V 124.000" strokeWidth="25.000" transform="translate(88.000 0)" />
        <path d="M 11.500 50 A 38.500 38.500 0 1 0 88.500 50 A 38.500 38.500 0 1 0 11.500 50" strokeWidth="23.000" transform="translate(196.000 0)" />
        <path d="M 87.500 0.000 V 100.000" strokeWidth="25.000" transform="translate(196.000 0)" />
        <path d="M 78.611 24.238 A 38.500 38.500 0 1 0 78.611 75.762" strokeWidth="23.000" transform="translate(304.000 0)" />
        <path d="M 88.500 50 A 38.500 38.500 0 1 0 81.147 72.630" strokeWidth="23.000" transform="translate(399.157 0)" />
        <path d="M 11.500 50 H 99.600" strokeWidth="17.000" transform="translate(399.157 0)" />
        <path d="M 11.500 100.000 V 39.500 A 28 28 0 0 1 39.500 11.500 H 69.500" strokeWidth="23.000" transform="translate(507.157 0)" />
      </g>
      <g fill="currentColor">
        <rect x="88.000" y="112" width="522.657" height="12" />
        <circle cx="610.657" cy="118.0" r="13" />
      </g>
    </svg>
  );
}
