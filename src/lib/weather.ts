// Open-Meteo client: free, keyless, CORS-enabled. Many locations are packed
// into one request via comma-separated lat/lng lists, then cached.
// Docs: https://open-meteo.com/en/docs

export interface Weather {
  temperature: number;
  apparent: number;
  humidity: number;
  precipitation: number;
  windSpeed: number;
  code: number;
}

export interface Condition {
  label: string;
  group: ConditionGroup;
}

export type ConditionGroup =
  | "clear"
  | "cloudy"
  | "fog"
  | "drizzle"
  | "rain"
  | "snow"
  | "storm";

export interface Point {
  lat: number;
  lng: number;
}

const API = "https://api.open-meteo.com/v1/forecast";
const BATCH_SIZE = 100;
const CURRENT_VARS =
  "temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m";

const cache = new Map<string, Weather>();

const keyOf = (lat: number, lng: number) => `${lat.toFixed(2)},${lng.toFixed(2)}`;
export const weatherKey = keyOf;

export async function fetchWeather(points: Point[]): Promise<Map<string, Weather>> {
  const result = new Map<string, Weather>();
  const missing: Point[] = [];

  for (const p of points) {
    const k = keyOf(p.lat, p.lng);
    const cached = cache.get(k);
    if (cached) result.set(k, cached);
    else if (!missing.some((m) => keyOf(m.lat, m.lng) === k)) missing.push(p);
  }

  for (let i = 0; i < missing.length; i += BATCH_SIZE) {
    await fetchChunk(missing.slice(i, i + BATCH_SIZE), result);
  }
  return result;
}

async function fetchChunk(chunk: Point[], result: Map<string, Weather>) {
  if (chunk.length === 0) return;
  const lats = chunk.map((p) => p.lat.toFixed(4)).join(",");
  const lngs = chunk.map((p) => p.lng.toFixed(4)).join(",");
  const url = `${API}?latitude=${lats}&longitude=${lngs}&current=${CURRENT_VARS}&timezone=auto`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`Open-Meteo error ${res.status}`);
  const data = await res.json();

  // One location returns an object; several return an array.
  const entries = Array.isArray(data) ? data : [data];
  entries.forEach((entry: any, idx: number) => {
    const point = chunk[idx];
    if (!point || !entry?.current) return;
    const c = entry.current;
    const w: Weather = {
      temperature: c.temperature_2m,
      apparent: c.apparent_temperature ?? c.temperature_2m,
      humidity: c.relative_humidity_2m ?? 0,
      precipitation: c.precipitation ?? 0,
      windSpeed: c.wind_speed_10m ?? 0,
      code: c.weather_code ?? 0,
    };
    const k = keyOf(point.lat, point.lng);
    cache.set(k, w);
    result.set(k, w);
  });
}

// WMO weather interpretation codes grouped into friendly conditions.
export function codeToCondition(code: number): Condition {
  if (code === 0) return { label: "Clear sky", group: "clear" };
  if (code === 1) return { label: "Mainly clear", group: "clear" };
  if (code === 2) return { label: "Partly cloudy", group: "cloudy" };
  if (code === 3) return { label: "Overcast", group: "cloudy" };
  if (code === 45 || code === 48) return { label: "Fog", group: "fog" };
  if (code >= 51 && code <= 57) return { label: "Drizzle", group: "drizzle" };
  if (code >= 61 && code <= 65) return { label: "Rain", group: "rain" };
  if (code >= 66 && code <= 67) return { label: "Freezing rain", group: "rain" };
  if (code >= 71 && code <= 77) return { label: "Snow", group: "snow" };
  if (code >= 80 && code <= 82) return { label: "Rain showers", group: "rain" };
  if (code >= 85 && code <= 86) return { label: "Snow showers", group: "snow" };
  if (code >= 95) return { label: "Thunderstorm", group: "storm" };
  return { label: "Unknown", group: "cloudy" };
}
