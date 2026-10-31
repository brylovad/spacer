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
    city: 2000,
    district: 1500,
    street: 1000,
    object: 500,
  } satisfies Record<PlaceLevel, number>,
  /** Środek Polski — wyniki wyszukiwania z Polski mają pierwszeństwo. */
  searchBias: { lat: 52.07, lon: 19.48 },
};
