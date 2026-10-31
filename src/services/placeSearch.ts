import type { PlaceContext } from "../shared/storyApi";
import type { Coordinates } from "./geolocation";
import { searchArticles } from "./wikipedia";

// Ręczne wyszukiwanie miejsc. Photon (OpenStreetMap) jest zrobiony do podpowiedzi w trakcie pisania —
// publiczny Nominatim tego zabrania. Wikipedia dokłada zabytki i obiekty, o których są artykuły.
// Publiczna instancja Photon działa w ramach uczciwego użycia; przy większym ruchu — własna lub płatny dostawca.
const PHOTON_URL = "https://photon.komoot.io/api/";
const PHOTON_LIMIT = 8;
const WIKI_LIMIT = 4;
export const MIN_QUERY_LENGTH = 3;

export type PlaceLevel = "country" | "region" | "city" | "district" | "street" | "object";

export interface PlaceSuggestion {
  id: string;
  name: string;
  level: PlaceLevel;
  /** Gdzie to jest, np. „Kraków, Polska”. */
  context: string;
  coords: Coordinates;
  place: PlaceContext;
  /** Artykuł Wikipedii o tym miejscu, jeśli znany od razu. */
  wikiPageId?: number;
}

interface PhotonProperties {
  osm_type?: string;
  osm_id?: number;
  osm_key?: string;
  osm_value?: string;
  type?: string;
  name?: string;
  country?: string;
  /** Kod kraju ISO 3166-1, np. „PL”. */
  countrycode?: string;
  state?: string;
  county?: string;
  city?: string;
  district?: string;
  locality?: string;
  street?: string;
  housenumber?: string;
}

interface PhotonFeature {
  geometry: { coordinates: [number, number] };
  properties: PhotonProperties;
}

function levelOf(p: PhotonProperties): PlaceLevel {
  switch (p.type) {
    case "country":
      return "country";
    case "state":
    case "county":
      return "region";
    case "city":
      return "city";
    case "district":
    case "locality":
      return "district";
    case "street":
      return "street";
    default:
      // Sam adres (ulica z numerem, bez nazwy obiektu) traktujemy jak ulicę.
      return p.housenumber && !p.name ? "street" : "object";
  }
}

/** Nazwa kraju w języku aplikacji z kodu ISO (np. „DE” → „Niemcy”); mapa podaje ją w języku lokalnym. */
function countryName(p: PhotonProperties, language: string): string | undefined {
  if (!p.countrycode) return p.country;
  try {
    return new Intl.DisplayNames([language], { type: "region" }).of(p.countrycode.toUpperCase()) ?? p.country;
  } catch {
    return p.country;
  }
}

function fromPhoton(feature: PhotonFeature, language: string): PlaceSuggestion | undefined {
  const p = feature.properties;
  const level = levelOf(p);
  const country = countryName(p, language);
  // Kraj nazywamy po polsku — to także tytuł artykułu w Wikipedii (np. „Niemcy”, nie „Deutschland”).
  const name =
    (level === "country" ? country : p.name) ??
    (p.street ? [p.street, p.housenumber].filter(Boolean).join(" ") : undefined);
  if (!name) return undefined;
  const [lon, lat] = feature.geometry.coordinates;
  const city = level === "city" ? name : p.city;
  const place: PlaceContext = {
    name,
    street: level === "street" ? (p.street ?? name) : p.street,
    district: level === "district" ? name : (p.district ?? p.locality),
    city: level === "country" || level === "region" ? undefined : city,
    country,
  };
  // Dopisek „gdzie to jest” — bez powtarzania samej nazwy.
  const contextParts: Record<PlaceLevel, (string | undefined)[]> = {
    country: [],
    region: [country],
    city: [p.state, country],
    district: [p.city, country],
    street: [p.district, p.city],
    object: [p.district ?? p.street, p.city ?? country],
  };
  const context = [...new Set(contextParts[level].filter((part): part is string => Boolean(part) && part !== name))].join(
    ", ",
  );
  return {
    id: `osm:${p.osm_type}${p.osm_id}`,
    name,
    level,
    context,
    coords: { lat, lon, accuracy: 0 },
    place,
  };
}

async function searchPhoton(
  query: string,
  language: string,
  signal?: AbortSignal,
  bias?: { lat: number; lon: number },
) {
  const url = new URL(PHOTON_URL);
  url.search = new URLSearchParams({
    q: query,
    limit: String(PHOTON_LIMIT),
    // Bez tego Photon bierze język przeglądarki — na telefonie po angielsku Warszawa przychodzi jako „Warsaw”,
    // a polska Wikipedia ma pod tym tytułem zupełnie inny artykuł. „default” = nazwy lokalne z mapy.
    lang: "default",
    ...(bias ? { lat: String(bias.lat), lon: String(bias.lon) } : {}),
  }).toString();
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(`Photon ${res.status}`);
  const data = (await res.json()) as { features?: PhotonFeature[] };
  return (data.features ?? [])
    .map((f) => fromPhoton(f, language))
    .filter((s): s is PlaceSuggestion => s !== undefined);
}

function baseName(title: string): string {
  return title.replace(/\s*\(.*\)$/, "").toLocaleLowerCase();
}

/** Podpowiedzi miejsc: najpierw OpenStreetMap, potem zabytki z Wikipedii, bez powtórzeń. */
export async function searchPlaces(
  query: string,
  language: string,
  bias: { lat: number; lon: number },
  signal?: AbortSignal,
): Promise<PlaceSuggestion[]> {
  const [photon, wiki] = await Promise.allSettled([
    searchPhoton(query, language, signal, bias),
    searchArticles(language, query, WIKI_LIMIT, signal),
  ]);
  if (photon.status === "rejected" && wiki.status === "rejected") throw photon.reason;

  const osm = photon.status === "fulfilled" ? photon.value : [];
  const seen = new Set(osm.map((s) => s.name.toLocaleLowerCase()));
  const articles = (wiki.status === "fulfilled" ? wiki.value : [])
    .filter((a) => !seen.has(baseName(a.title)))
    .map(
      (a): PlaceSuggestion => ({
        id: `wiki:${a.pageId}`,
        name: a.title.replace(/\s*\(.*\)$/, ""),
        level: "object",
        context: a.description ?? "",
        coords: a.coords,
        place: { name: a.title.replace(/\s*\(.*\)$/, "") },
        wikiPageId: a.pageId,
      }),
    );
  // Ten sam obiekt bywa w OSM kilka razy (np. budynek i teren) — zostawiamy pierwszy.
  const unique = osm.filter(
    (s, i) => osm.findIndex((o) => o.name === s.name && o.level === s.level && o.context === s.context) === i,
  );
  return [...unique, ...articles];
}
