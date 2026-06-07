// Downloads Natural Earth GeoJSON (countries + admin-1 states) and writes slim,
// browser-friendly versions into public/data/.
//
// Source: martynafford/natural-earth-geojson (public domain Natural Earth data).
// The raw admin-1 file is ~63 MB; we strip unused properties and round
// coordinates to ~2 decimals (~1 km) to ship a much smaller payload.
import { mkdir, writeFile, readFile, stat } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dirname, "..", "public", "data");
const cacheDir = join(__dirname, "..", ".data-cache");

const BASE =
  "https://raw.githubusercontent.com/martynafford/natural-earth-geojson/master";

const COORD_PRECISION = 2;

async function cachedFetch(url, cacheName) {
  const cachePath = join(cacheDir, cacheName);
  try {
    const s = await stat(cachePath);
    if (s.size > 0) {
      console.log(`• using cached ${cacheName} (${(s.size / 1e6).toFixed(1)} MB)`);
      return JSON.parse(await readFile(cachePath, "utf8"));
    }
  } catch {
    // not cached
  }
  console.log(`↓ downloading ${url}`);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed ${url}: ${res.status} ${res.statusText}`);
  const text = await res.text();
  await mkdir(cacheDir, { recursive: true });
  await writeFile(cachePath, text);
  return JSON.parse(text);
}

const round = (n) => {
  const f = 10 ** COORD_PRECISION;
  return Math.round(n * f) / f;
};

// Recursively round coordinate arrays and drop consecutive duplicate points.
function roundCoords(coords) {
  if (typeof coords[0] === "number") {
    return [round(coords[0]), round(coords[1])];
  }
  const mapped = coords.map(roundCoords);
  // Dedupe consecutive identical points within linear rings.
  if (typeof mapped[0]?.[0] === "number") {
    const out = [];
    for (const p of mapped) {
      const prev = out[out.length - 1];
      if (!prev || prev[0] !== p[0] || prev[1] !== p[1]) out.push(p);
    }
    return out.length >= 4 ? out : mapped;
  }
  return mapped;
}

function slimFeature(feature, propsFn) {
  return {
    type: "Feature",
    properties: propsFn(feature.properties),
    geometry: {
      type: feature.geometry.type,
      coordinates: roundCoords(feature.geometry.coordinates),
    },
  };
}

async function writeJson(name, data) {
  const dest = join(outDir, name);
  const text = JSON.stringify(data);
  await writeFile(dest, text);
  console.log(`✓ wrote ${name} (${(Buffer.byteLength(text) / 1e6).toFixed(1)} MB)`);
}

async function main() {
  await mkdir(outDir, { recursive: true });

  const countriesRaw = await cachedFetch(
    `${BASE}/110m/cultural/ne_110m_admin_0_countries.json`,
    "countries.raw.json"
  );
  const countries = {
    type: "FeatureCollection",
    features: countriesRaw.features.map((f) =>
      slimFeature(f, (p) => ({
        name: p.NAME,
        admin: p.ADMIN,
        iso_a2: p.ISO_A2,
        adm0_a3: p.ADM0_A3,
      }))
    ),
  };
  await writeJson("countries.json", countries);

  const statesRaw = await cachedFetch(
    `${BASE}/10m/cultural/ne_10m_admin_1_states_provinces.json`,
    "states.raw.json"
  );
  const states = {
    type: "FeatureCollection",
    features: statesRaw.features.map((f) =>
      slimFeature(f, (p) => ({
        name: p.name,
        admin: p.admin,
        adm0_a3: p.adm0_a3,
        iso_a2: p.iso_a2,
        lat: p.latitude,
        lng: p.longitude,
      }))
    ),
  };
  await writeJson("states.json", states);

  console.log("Done.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
