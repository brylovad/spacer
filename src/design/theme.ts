// Tryb ciemny design systemu włącza atrybut data-theme="dark" na <html>; ustawiamy go zgodnie z systemem telefonu.
export function applySystemTheme() {
  const query = window.matchMedia("(prefers-color-scheme: dark)");
  const apply = () => document.documentElement.setAttribute("data-theme", query.matches ? "dark" : "light");
  apply();
  query.addEventListener("change", apply);
}
