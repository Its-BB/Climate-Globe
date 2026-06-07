import { useCallback, useEffect, useState } from "react";
import type { Feature } from "geojson";
import GlobeView, { type FocusTarget } from "./components/GlobeView";
import MetricToggle from "./components/MetricToggle";
import Legend from "./components/Legend";
import BackButton from "./components/BackButton";
import Loader from "./components/Loader";
import SearchBar from "./components/SearchBar";
import InfoPanel from "./components/InfoPanel";
import {
  altitudeFor,
  centroidOf,
  loadCountries,
  loadStates,
  repPoint,
  statesForCountry,
  type CountryFeature,
} from "./lib/geo";
import {
  fetchWeather,
  weatherKey,
  codeToCondition,
  type Point,
  type Weather,
} from "./lib/weather";
import { colorFor, type Metric } from "./lib/colors";

type View = "world" | "country";

export default function App() {
  const [countries, setCountries] = useState<CountryFeature[]>([]);
  const [view, setView] = useState<View>("world");
  const [statePolys, setStatePolys] = useState<Feature[]>([]);
  const [selectedCountry, setSelectedCountry] = useState<CountryFeature | null>(
    null
  );
  const [metric, setMetric] = useState<Metric>("temperature");
  const [weather, setWeather] = useState<Map<string, Weather>>(new Map());
  const [focus, setFocus] = useState<FocusTarget | null>(null);
  const [hovered, setHovered] = useState<Feature | null>(null);
  const [loading, setLoading] = useState<string | null>("Loading the world...");

  const mergeWeather = useCallback((next: Map<string, Weather>) => {
    setWeather((prev) => {
      const merged = new Map(prev);
      next.forEach((v, k) => merged.set(k, v));
      return merged;
    });
  }, []);

  // Load countries + their current weather on mount.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const feats = await loadCountries();
      if (cancelled) return;
      setCountries(feats);
      setLoading("Fetching live weather...");
      const points: Point[] = feats.map((f) => repPoint(f));
      try {
        const w = await fetchWeather(points);
        if (!cancelled) mergeWeather(w);
      } catch (e) {
        console.error("weather fetch failed", e);
      }
      if (!cancelled) setLoading(null);
    })();
    return () => {
      cancelled = true;
    };
  }, [mergeWeather]);

  const polygons: Feature[] = view === "world" ? (countries as Feature[]) : statePolys;

  const drillInto = useCallback(
    async (country: CountryFeature) => {
      setSelectedCountry(country);
      setView("country");
      setHovered(null);
      const [lng, lat] = centroidOf(country);
      setFocus({ lat, lng, altitude: altitudeFor(country) });

      setLoading(`Loading ${country.properties.name}...`);
      const all = await loadStates();
      let polys = statesForCountry(all, country.properties.adm0_a3) as Feature[];
      // Fall back to the country outline for nations without admin-1 data.
      if (polys.length === 0) polys = [country];
      setStatePolys(polys);

      setLoading("Fetching live weather...");
      try {
        const w = await fetchWeather(polys.map((f) => repPoint(f)));
        mergeWeather(w);
      } catch (e) {
        console.error("weather fetch failed", e);
      }
      setLoading(null);
    },
    [mergeWeather]
  );

  const goBack = useCallback(() => {
    setView("world");
    setSelectedCountry(null);
    setStatePolys([]);
    setHovered(null);
    setFocus({ lat: 20, lng: 0, altitude: 2.5 });
  }, []);

  const handlePolygonClick = useCallback(
    (f: Feature) => {
      if (view === "world") drillInto(f as CountryFeature);
    },
    [view, drillInto]
  );

  const capColor = useCallback(
    (f: Feature) => {
      const { lat, lng } = repPoint(f);
      return colorFor(metric, weather.get(weatherKey(lat, lng)));
    },
    [metric, weather]
  );

  const altitude = useCallback(
    (f: Feature) => {
      const base = view === "world" ? 0.01 : 0.02;
      return f === hovered ? base + 0.06 : base;
    },
    [view, hovered]
  );

  const label = useCallback(
    (f: Feature) => {
      const props = f.properties as any;
      const name = props.name ?? "Unknown";
      const isCountry = view === "world";
      const sub = isCountry ? "Country" : selectedCountry?.properties.name ?? "";
      const { lat, lng } = repPoint(f);
      const w = weather.get(weatherKey(lat, lng));
      return buildTooltip(name, sub, w, isCountry);
    },
    [view, weather, selectedCountry]
  );

  // The detail panel reflects the hovered region, falling back to the
  // selected country when nothing is hovered inside a drill-in.
  const detailFeature: Feature | null =
    hovered ?? (view === "country" ? selectedCountry : null);
  const detail = detailFeature
    ? (() => {
        const { lat, lng } = repPoint(detailFeature);
        const isCountry = view === "world" || detailFeature === selectedCountry;
        return {
          name: (detailFeature.properties as any).name ?? "Unknown",
          sub: isCountry ? "Country" : selectedCountry?.properties.name ?? "",
          isCountry,
          weather: weather.get(weatherKey(lat, lng)),
        };
      })()
    : null;

  return (
    <div className="app">
      <div className="globe-wrap">
        <GlobeView
          polygons={polygons}
          capColor={capColor}
          label={label}
          altitude={altitude}
          onPolygonClick={handlePolygonClick}
          onPolygonHover={setHovered}
          focus={focus}
          autoRotate={view === "world"}
        />
      </div>

      <div className="title-bar">
        <h1>Climate Globe</h1>
        {view === "country" && selectedCountry && (
          <div className="breadcrumb">{selectedCountry.properties.name}</div>
        )}
      </div>

      {view === "world" && countries.length > 0 && (
        <SearchBar countries={countries} onSelect={drillInto} />
      )}

      <MetricToggle metric={metric} onChange={setMetric} />
      <Legend metric={metric} />

      {detail && (
        <InfoPanel
          name={detail.name}
          sub={detail.sub}
          weather={detail.weather}
          isCountry={detail.isCountry}
        />
      )}

      {view === "country" && <BackButton onClick={goBack} />}
      {loading && <Loader message={loading} />}

      <div className="attribution">
        Weather:{" "}
        <a href="https://open-meteo.com/" target="_blank" rel="noreferrer">
          Open-Meteo
        </a>{" "}
        (CC BY 4.0) · Borders: Natural Earth
      </div>
    </div>
  );
}

function buildTooltip(
  name: string,
  sub: string,
  w: Weather | undefined,
  isCountry: boolean
): string {
  if (!w) {
    return `<div class="gl-tooltip"><div class="t-name">${name}</div><div class="t-sub">${sub}</div><div class="t-cond">No live data</div></div>`;
  }
  const cond = codeToCondition(w.code);
  const hint = isCountry
    ? `<div class="t-hint">Click to explore regions</div>`
    : "";
  return `
    <div class="gl-tooltip">
      <div class="t-name">${name}</div>
      <div class="t-sub">${sub}</div>
      <div class="t-cond">${cond.label}</div>
      <div class="t-stats">
        <div class="t-stat"><div class="v">${Math.round(w.temperature)}°C</div><div class="l">Temp</div></div>
        <div class="t-stat"><div class="v">${w.precipitation.toFixed(1)} mm</div><div class="l">Rain/h</div></div>
        <div class="t-stat"><div class="v">${Math.round(w.windSpeed)}</div><div class="l">km/h</div></div>
      </div>
      ${hint}
    </div>`;
}
