import type { PlaceContext } from "../shared/storyApi";
import type { Coordinates } from "./geolocation";

// Odwrotne geokodowanie przez OpenStreetMap Nominatim.
// Limit publicznej instancji: 1 zapytanie/s — przy większym ruchu trzeba przejść na płatnego dostawcę lub własną instancję.
interface NominatimAddress {
  road?: string;
  pedestrian?: string;
  footway?: string;
  square?: string;
  suburb?: string;
  city_district?: string;
  quarter?: string;
  neighbourhood?: string;
  borough?: string;
  city?: string;
  town?: string;
  village?: string;
  municipality?: string;
  country?: string;
}

export async function reverseGeocode(coords: Coordinates, language: string): Promise<PlaceContext> {
  const url = new URL("https://nominatim.openstreetmap.org/reverse");
  url.search = new URLSearchParams({
    lat: String(coords.lat),
    lon: String(coords.lon),
    format: "jsonv2",
    zoom: "18",
    addressdetails: "1",
    "accept-language": language,
  }).toString();
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Nominatim ${res.status}`);
  const data = (await res.json()) as { address?: NominatimAddress };
  const a = data.address ?? {};
  return {
    street: a.road ?? a.pedestrian ?? a.square ?? a.footway,
    district: a.suburb ?? a.city_district ?? a.borough ?? a.quarter ?? a.neighbourhood,
    city: a.city ?? a.town ?? a.village ?? a.municipality,
    country: a.country,
  };
}
