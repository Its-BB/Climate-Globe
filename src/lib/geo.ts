// GeoJSON loading + geometry helpers (centroid, camera framing, filtering).
import { geoCentroid, geoBounds } from "d3-geo";
import type { Feature, FeatureCollection, Geometry } from "geojson";

export interface CountryProps {
  name: string;
  admin: string;
  iso_a2: string;
  adm0_a3: string;
}

export interface StateProps {
  name: string;
  admin: string;
  adm0_a3: string;
  iso_a2: string;
  lat: number;
  lng: number;
}

export type CountryFeature = Feature<Geometry, CountryProps>;
export type StateFeature = Feature<Geometry, StateProps>;

let countriesCache: CountryFeature[] | null = null;
let statesCache: StateFeature[] | null = null;

export async function loadCountries(): Promise<CountryFeature[]> {
  if (countriesCache) return countriesCache;
  const res = await fetch("/data/countries.json");
  const fc = (await res.json()) as FeatureCollection<Geometry, CountryProps>;
  countriesCache = fc.features.filter((f) => f.properties.adm0_a3 !== "ATA"); // drop Antarctica
  return countriesCache;
}

// States file is large (~17 MB) so it's only loaded the first time the user
// drills into a country.
export async function loadStates(): Promise<StateFeature[]> {
  if (statesCache) return statesCache;
  const res = await fetch("/data/states.json");
  const fc = (await res.json()) as FeatureCollection<Geometry, StateProps>;
  statesCache = fc.features;
  return statesCache;
}

export function statesForCountry(
  states: StateFeature[],
  adm0_a3: string
): StateFeature[] {
  return states.filter((s) => s.properties.adm0_a3 === adm0_a3);
}

/** [lng, lat] centroid of a feature. */
export function centroidOf(feature: Feature): [number, number] {
  return geoCentroid(feature) as [number, number];
}

/**
 * Representative point for weather lookups: prefer stored lat/lng (states),
 * otherwise fall back to the geometric centroid (countries).
 */
export function repPoint(feature: Feature): { lat: number; lng: number } {
  const p = feature.properties as Partial<StateProps> | null;
  if (
    p &&
    Number.isFinite(p.lat) &&
    Number.isFinite(p.lng) &&
    !(p.lat === 0 && p.lng === 0)
  ) {
    return { lat: p.lat as number, lng: p.lng as number };
  }
  const [clng, clat] = centroidOf(feature);
  return { lat: clat, lng: clng };
}

/**
 * Camera altitude that frames a feature: bigger geographic span -> higher
 * altitude. Clamped so tiny states don't zoom in absurdly close.
 */
export function altitudeFor(feature: Feature): number {
  const [[minLng, minLat], [maxLng, maxLat]] = geoBounds(feature);
  const span = Math.max(Math.abs(maxLng - minLng), Math.abs(maxLat - minLat));
  // Map a ~0-90° span to a ~0.3-2.2 altitude range.
  const alt = 0.25 + (span / 90) * 2.2;
  return Math.min(Math.max(alt, 0.35), 2.2);
}
