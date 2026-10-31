import { t } from "../i18n";
import type { PlaceContext } from "../shared/storyApi";

export function placeParts(place: PlaceContext): string[] {
  const parts = [place.name, place.street, place.district, place.city].filter((p): p is string => Boolean(p));
  // Kraj pokazujemy tylko, gdy nie ma nic dokładniejszego (np. wybrano cały kraj).
  if (parts.length === 0 && place.country) parts.push(place.country);
  return [...new Set(parts)];
}

export function PlaceCard({ place, label = t.youAreHere }: { place: PlaceContext; label?: string }) {
  const [main, ...rest] = placeParts(place);
  return (
    <section className="card">
      <h2 className="label">{label}</h2>
      <p className="place-main">{main}</p>
      {rest.length > 0 && <p className="place-sub">{rest.join(" · ")}</p>}
    </section>
  );
}
