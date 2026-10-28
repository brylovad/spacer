import type { PlaceContext, SourceArticle } from "../shared/storyApi";
import type { Coordinates } from "./geolocation";

// Źródło treści: API MediaWiki. Wywoływane bezpośrednio z przeglądarki (origin=* włącza CORS).

const FULL_TEXT_CHARS = 4000;

interface WikiPage {
  pageid: number;
  title: string;
  fullurl?: string;
  extract?: string;
  missing?: boolean;
  pageprops?: { disambiguation?: string };
}

function apiUrl(language: string, params: Record<string, string>): URL {
  const url = new URL(`https://${language}.wikipedia.org/w/api.php`);
  url.search = new URLSearchParams({ format: "json", formatversion: "2", origin: "*", ...params }).toString();
  return url;
}

async function query<T>(language: string, params: Record<string, string>): Promise<T> {
  const res = await fetch(apiUrl(language, { action: "query", ...params }));
  if (!res.ok) throw new Error(`Wikipedia ${res.status}`);
  return (await res.json()) as T;
}

async function geosearch(language: string, coords: Coordinates, radius: number, limit: number) {
  const data = await query<{ query?: { geosearch: { pageid: number; dist: number }[] } }>(language, {
    list: "geosearch",
    gscoord: `${coords.lat}|${coords.lon}`,
    gsradius: String(radius),
    gslimit: String(limit),
  });
  return data.query?.geosearch ?? [];
}

async function searchTitle(language: string, text: string): Promise<number | undefined> {
  const data = await query<{ query?: { search: { pageid: number; title: string }[] } }>(language, {
    list: "search",
    srsearch: text,
    srlimit: "1",
  });
  return data.query?.search[0]?.pageid;
}

async function pageIdByTitle(language: string, title: string): Promise<number | undefined> {
  const data = await query<{ query?: { pages: WikiPage[] } }>(language, { titles: title, redirects: "1" });
  const page = data.query?.pages[0];
  return page && !page.missing ? page.pageid : undefined;
}

/** Wstępy (intro) wielu artykułów w jednym zapytaniu. */
async function fetchIntros(language: string, pageIds: number[]): Promise<WikiPage[]> {
  if (pageIds.length === 0) return [];
  const data = await query<{ query?: { pages: WikiPage[] } }>(language, {
    pageids: pageIds.join("|"),
    prop: "extracts|info|pageprops",
    exintro: "1",
    explaintext: "1",
    exlimit: "max",
    inprop: "url",
    ppprop: "disambiguation",
  });
  return data.query?.pages ?? [];
}

/** Dłuższy tekst jednego artykułu (API zwraca pełne teksty tylko po jednym). */
async function fetchFullText(language: string, pageId: number): Promise<string | undefined> {
  const data = await query<{ query?: { pages: WikiPage[] } }>(language, {
    pageids: String(pageId),
    prop: "extracts",
    explaintext: "1",
    exsectionformat: "plain",
  });
  return data.query?.pages[0]?.extract?.slice(0, FULL_TEXT_CHARS);
}

function normalize(s: string): string {
  return s.toLocaleLowerCase().replace(/^(ulica|aleja|al\.|ul\.|plac|pl\.)\s+/, "");
}

/**
 * Zbiera artykuły o ulicy, dzielnicy, mieście i pobliskich miejscach.
 * Kolejność wyniku: najpierw miejsce, w którym stoi użytkownik, potem pobliskie punkty od najbliższego.
 */
export async function gatherSources(
  language: string,
  coords: Coordinates,
  place: PlaceContext,
  radius: number,
  limit: number,
): Promise<SourceArticle[]> {
  const [nearby, streetId, districtId, cityId] = await Promise.all([
    geosearch(language, coords, radius, limit),
    place.street ? searchTitle(language, `${place.street} ${place.city ?? ""}`) : undefined,
    place.district ? searchTitle(language, `${place.district} ${place.city ?? ""}`) : undefined,
    place.city ? pageIdByTitle(language, place.city) : undefined,
  ]);

  const distanceById = new Map(nearby.map((n) => [n.pageid, n.dist]));
  const contextIds = [streetId, districtId, cityId].filter((id): id is number => id !== undefined);
  const allIds = [...new Set([...contextIds, ...nearby.map((n) => n.pageid)])];
  const pages = (await fetchIntros(language, allIds)).filter((p) => !p.missing && !p.pageprops?.disambiguation);
  const pageById = new Map(pages.map((p) => [p.pageid, p]));

  // Wyszukiwarka może zwrócić inny artykuł niż o tej ulicy — bierzemy go tylko, gdy tytuł pasuje.
  const street = streetId !== undefined ? pageById.get(streetId) : undefined;
  if (street && place.street && !normalize(street.title).includes(normalize(place.street))) {
    pageById.delete(street.pageid);
  }

  // Najważniejsze artykuły dostają dłuższy tekst niż sam wstęp.
  const nearest = nearby.slice(0, 3).map((n) => n.pageid);
  const detailed = [...new Set([streetId, districtId, ...nearest])].filter(
    (id): id is number => id !== undefined && pageById.has(id),
  );
  const fullTexts = await Promise.all(detailed.map((id) => fetchFullText(language, id)));
  detailed.forEach((id, i) => {
    const text = fullTexts[i];
    const page = pageById.get(id);
    if (page && text) page.extract = text;
  });

  const ordered = [...contextIds.filter((id) => !distanceById.has(id)), ...nearby.map((n) => n.pageid)];
  return [...new Set(ordered)]
    .map((id) => pageById.get(id))
    .filter((p): p is WikiPage => p !== undefined && Boolean(p.extract?.trim()))
    .map((p) => ({
      title: p.title,
      url: p.fullurl ?? `https://${language}.wikipedia.org/?curid=${p.pageid}`,
      distanceMeters: distanceById.get(p.pageid),
      extract: p.extract!.trim(),
    }));
}
