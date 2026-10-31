import type { PlaceLevel } from "./services/placeSearch";

// Ustawienia, które w przyszłości mogą trafić do ekranu ustawień.
export const config = {
  /** Język interfejsu, Wikipedii i opowieści. */
  language: "pl",
  /** Locale dla syntezy mowy. */
  speechLocale: "pl-PL",
  /** Promień wyszukiwania ciekawych miejsc w metrach (Wikipedia pozwala maks. 10 000). */
  searchRadiusMeters: 1000,
  maxNearbyPlaces: 10,
  /** Promień pobliskich miejsc dla miejsca z wyszukiwarki; 0 = opowieść tylko o samym miejscu. */
  searchRadiusByLevel: {
    country: 0,
    region: 0,
    city: 0,
    district: 1500,
    street: 1000,
    object: 500,
  } satisfies Record<PlaceLevel, number>,
  /** Jak daleko od wybranego punktu może leżeć artykuł o głównym temacie (chroni przed artykułem o innym miejscu tej nazwy). */
  focusMaxKmByLevel: {
    country: 1500,
    region: 300,
    city: 40,
    district: 10,
    street: 5,
    object: 3,
  } satisfies Record<PlaceLevel, number>,
  /** Ile znaków artykułu o głównym temacie dostaje narrator przy opowieści o całym mieście, regionie czy kraju. */
  overviewTextChars: 12000,
  /** Środek Polski — wyniki wyszukiwania z Polski mają pierwszeństwo. */
  searchBias: { lat: 52.07, lon: 19.48 },
};
