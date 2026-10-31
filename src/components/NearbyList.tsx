import { t } from "../i18n";
import type { SourceArticle } from "../shared/storyApi";

export function NearbyList({ sources }: { sources: Pick<SourceArticle, "title" | "url" | "distanceMeters">[] }) {
  const nearby = sources.filter((s) => s.distanceMeters !== undefined);
  if (nearby.length === 0) return null;
  return (
    <section className="card">
      <h2 className="label">{t.nearby}</h2>
      <ul className="places">
        {nearby.map((s) => (
          <li key={s.url}>
            <a href={s.url} target="_blank" rel="noreferrer">
              {s.title}
            </a>
            <span className="distance">{t.meters(s.distanceMeters!)}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
