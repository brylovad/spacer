import { t } from "../i18n";
import type { SourceArticle } from "../shared/storyApi";

export function NearbyList({ sources }: { sources: Pick<SourceArticle, "title" | "url" | "distanceMeters">[] }) {
  const nearby = sources.filter((s) => s.distanceMeters !== undefined);
  if (nearby.length === 0) return null;
  return (
    <section className="sw-card">
      <h3>{t.nearby}</h3>
      <ul className="places">
        {nearby.map((s) => (
          <li key={s.url}>
            <a href={s.url} target="_blank" rel="noreferrer">
              {s.title}
            </a>
            <span className="sw-badge">{t.meters(s.distanceMeters!)}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
