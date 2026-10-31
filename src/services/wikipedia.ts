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
  coordinates?: { lat: number; lon: number }[];
  index?: number;
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

function distanceKm(a: { lat: number; lon: number }, b: { lat: number; lon: number }): number {
  const rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad;
  const dLon = (b.lon - a.lon) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLon / 2) ** 2;
  return 12742 * Math.asin(Math.sqrt(h));
}

/** Artykuł pasuje, gdy nie jest stroną ujednoznaczniającą, a jego współrzędne leżą blisko wybranego miejsca. */
function isNear(page: WikiPage | undefined, near: Coordinates, maxKm: number): boolean {
  const coords = page?.coordinates?.[0];
  return Boolean(page && !page.missing && !page.pageprops?.disambiguation && coords && distanceKm(coords, near) <= maxKm);
}

const PLACE_PROPS = { prop: "coordinates|pageprops", ppprop: "disambiguation", colimit: "max" };

/**
 * Artykuł o miejscu o tej nazwie, leżącym nie dalej niż maxKm od wskazanego punktu.
 * Chroni przed tytułami o innym znaczeniu (np. „Warsaw” w polskiej Wikipedii to miejscowości w USA).
 */
async function findPlaceArticle(
  language: string,
  name: string,
  context: string | undefined,
  near: Coordinates,
  maxKm: number,
  allowWithoutCoords = false,
): Promise<number | undefined> {
  const exact = await query<{ query?: { pages: WikiPage[] } }>(language, { titles: name, redirects: "1", ...PLACE_PROPS });
  const page = exact.query?.pages[0];
  if (page && isNear(page, near, maxKm)) return page.pageid;
  // Nie każdy artykuł o kraju czy regionie ma współrzędne — wtedy wystarcza dokładny tytuł.
  if (allowWithoutCoords && page && !page.missing && !page.pageprops?.disambiguation && !page.coordinates?.length) {
    return page.pageid;
  }

  const found = await query<{ query?: { pages: WikiPage[] } }>(language, {
    generator: "search",
    gsrsearch: `${name} ${context ?? ""}`.trim(),
    gsrlimit: "5",
    ...PLACE_PROPS,
  });
  return (found.query?.pages ?? [])
    .sort((a, b) => (a.index ?? 0) - (b.index ?? 0))
    .find((p) => isNear(p, near, maxKm))?.pageid;
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
async function fetchFullText(language: string, pageId: number, maxChars = FULL_TEXT_CHARS): Promise<string | undefined> {
  const data = await query<{ query?: { pages: WikiPage[] } }>(language, {
    pageids: String(pageId),
    prop: "extracts",
    explaintext: "1",
    exsectionformat: "plain",
  });
  return data.query?.pages[0]?.extract?.slice(0, maxChars);
}

function normalize(s: string): string {
  return s.toLocaleLowerCase().replace(/^(ulica|aleja|al\.|ul\.|plac|pl\.)\s+/, "");
}

/** Główny temat opowieści wybrany w wyszukiwarce (kraj, region, obiekt). */
export interface SourceFocus {
  /** Znany artykuł (np. podpowiedź z Wikipedii). */
  pageId?: number;
  /** Nazwa do odszukania artykułu, gdy pageId nieznane. */
  name?: string;
  /** Doprecyzowanie wyszukiwania, np. miasto obiektu. */
  context?: string;
  /** Jak daleko od wybranego punktu może leżeć artykuł o tym miejscu (kraj — daleko, obiekt — blisko). */
  maxKm: number;
  /** Przyjmij artykuł o dokładnie tym tytule, nawet bez współrzędnych (kraj, region). */
  allowWithoutCoords?: boolean;
}

export interface GatherOptions {
  /** Promień szukania pobliskich miejsc; 0 = bez pobliskich (np. cały kraj). */
  radius: number;
  limit: number;
  focus?: SourceFocus;
  /** Dłuższy tekst artykułu o głównym temacie (opowieść o całym mieście, regionie, kraju). */
  mainTextChars?: number;
}

async function findFocus(
  language: string,
  focus: SourceFocus | undefined,
  near: Coordinates,
): Promise<number | undefined> {
  if (!focus) return undefined;
  if (focus.pageId !== undefined) return focus.pageId;
  if (!focus.name) return undefined;
  return findPlaceArticle(language, focus.name, focus.context, near, focus.maxKm, focus.allowWithoutCoords);
}

// Artykuł o mieście musi opisywać miasto leżące w pobliżu (środek miasta bywa kilkanaście km od punktu).
const CITY_MAX_KM = 40;

/**
 * Zbiera artykuły o wybranym obiekcie, ulicy, dzielnicy, mieście i pobliskich miejscach.
 * Kolejność wyniku: najpierw główny temat i miejsce, potem pobliskie punkty od najbliższego.
 */
export async function gatherSources(
  language: string,
  coords: Coordinates,
  place: PlaceContext,
  { radius, limit, focus, mainTextChars }: GatherOptions,
): Promise<SourceArticle[]> {
  const [nearby, focusId, streetId, districtId, cityId] = await Promise.all([
    radius > 0 ? geosearch(language, coords, radius, limit) : [],
    findFocus(language, focus, coords),
    place.street ? searchTitle(language, `${place.street} ${place.city ?? ""}`) : undefined,
    place.district ? searchTitle(language, `${place.district} ${place.city ?? ""}`) : undefined,
    place.city ? findPlaceArticle(language, place.city, place.country, coords, CITY_MAX_KM) : undefined,
  ]);

  const distanceById = new Map(nearby.map((n) => [n.pageid, n.dist]));
  const contextIds = [focusId, streetId, districtId, cityId].filter((id): id is number => id !== undefined);
  const allIds = [...new Set([...contextIds, ...nearby.map((n) => n.pageid)])];
  const pages = (await fetchIntros(language, allIds)).filter((p) => !p.missing && !p.pageprops?.disambiguation);
  const pageById = new Map(pages.map((p) => [p.pageid, p]));

  // Wyszukiwarka może zwrócić inny artykuł niż o tej ulicy — bierzemy go tylko, gdy tytuł pasuje.
  const street = streetId !== undefined ? pageById.get(streetId) : undefined;
  if (street && place.street && !normalize(street.title).includes(normalize(place.street))) {
    pageById.delete(street.pageid);
  }

  // Najważniejsze artykuły (główny temat i miejsce, najbliższe punkty) dostają dłuższy tekst niż sam wstęp.
  const mainIds = [...new Set(contextIds)].filter((id) => pageById.has(id)).slice(0, 2);
  const nearest = nearby.slice(0, 3).map((n) => n.pageid);
  const detailed = [...new Set([...mainIds, ...nearest])].filter((id) => pageById.has(id));
  const fullTexts = await Promise.all(
    detailed.map((id, i) => fetchFullText(language, id, i === 0 && mainTextChars ? mainTextChars : undefined)),
  );
  detailed.forEach((id, i) => {
    const text = fullTexts[i];
    const page = pageById.get(id);
    if (page && text) page.extract = text;
  });

  const ordered = [...contextIds.filter((id) => !distanceById.has(id) || id === focusId), ...nearby.map((n) => n.pageid)];
  return [...new Set(ordered)]
    .map((id) => pageById.get(id))
    .filter((p): p is WikiPage => p !== undefined && Boolean(p.extract?.trim()))
    .map((p) => ({
      title: p.title,
      url: p.fullurl ?? `https://${language}.wikipedia.org/?curid=${p.pageid}`,
      distanceMeters: p.pageid === focusId ? undefined : distanceById.get(p.pageid),
      extract: p.extract!.trim(),
    }));
}

export interface ArticleSuggestion {
  pageId: number;
  title: string;
  description?: string;
  coords: Coordinates;
}

/** Artykuły z Wikipedii pasujące do początku nazwy i mające współrzędne (zabytki, obiekty). */
export async function searchArticles(
  language: string,
  text: string,
  limit: number,
  signal?: AbortSignal,
): Promise<ArticleSuggestion[]> {
  const url = apiUrl(language, {
    action: "query",
    generator: "prefixsearch",
    gpssearch: text,
    gpslimit: String(limit),
    prop: "coordinates|description|pageprops",
    ppprop: "disambiguation",
  });
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(`Wikipedia ${res.status}`);
  const data = (await res.json()) as {
    query?: {
      pages: (WikiPage & { index?: number; description?: string; coordinates?: { lat: number; lon: number }[] })[];
    };
  };
  return (data.query?.pages ?? [])
    .filter((p) => p.coordinates?.length && !p.pageprops?.disambiguation)
    .sort((a, b) => (a.index ?? 0) - (b.index ?? 0))
    .map((p) => ({
      pageId: p.pageid,
      title: p.title,
      description: p.description,
      coords: { lat: p.coordinates![0].lat, lon: p.coordinates![0].lon, accuracy: 0 },
    }));
}
