// Generuje src/design/tokens.css z src/design/tokens.json (design system „Sunrise Walk”).
// Po zmianie tokenów w design systemie: podmień tokens.json i uruchom `npm run tokens`.
import { readFileSync, writeFileSync } from "node:fs";

const src = new URL("../src/design/tokens.json", import.meta.url);
const out = new URL("../src/design/tokens.css", import.meta.url);
const tokens = JSON.parse(readFileSync(src, "utf8"));
const [primaryTheme, ...otherThemes] = tokens.color.themes.map((t) => t.id);

const valueFor = (token, theme) => (typeof token.value === "string" ? token.value : (token.value[theme] ?? token.value[primaryTheme]));

function themed(families, theme) {
  return families
    .flatMap((family) => family.tokens)
    .filter((t) => theme === primaryTheme || (typeof t.value === "object" && t.value[theme] !== undefined))
    .map((t) => `  --${t.name}: ${valueFor(t, theme)};`);
}

const themedFamilies = [tokens.color, tokens.shadow].filter(Boolean);
const plainFamilies = [tokens.spacing, tokens.radius].filter(Boolean);
const families = Object.entries(tokens.type.families).map(([name, stack]) => `  --font-${name}: ${stack};`);
const textStyles = tokens.type.groups.flatMap((g) =>
  g.styles.map((s) => {
    const font = `${s.fontWeight} ${s.fontSize}/${s.lineHeight} var(--font-${g.family})`;
    return [`  --text-${s.name}: ${font};`, s.letterSpacing ? `  --tracking-${s.name}: ${s.letterSpacing};` : null];
  }),
).flat().filter(Boolean);

const lines = [
  `/* ${tokens.name} — generated from tokens.json; do not edit by hand (npm run tokens). */`,
  ":root {",
  ...themed(themedFamilies, primaryTheme),
  ...plainFamilies.flatMap((f) => f.tokens.map((t) => `  --${t.name}: ${t.value};`)),
  ...families,
  ...textStyles,
  "}",
  ...otherThemes.flatMap((theme) => [``, `:root[data-theme="${theme}"] {`, `  color-scheme: ${theme};`, ...themed(themedFamilies, theme), "}"]),
  "",
];
writeFileSync(out, lines.join("\n"));
console.log(`Wrote ${out.pathname}`);
