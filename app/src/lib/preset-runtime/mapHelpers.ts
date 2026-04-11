/**
 * mapHelpers — real-geography helper registry exposed to AI-generated presets.
 *
 * Problem this solves: without these helpers, the AI hallucinates SVG path data
 * like `M 150 80 L 180 60 ...` that looks map-shaped but is geographically bogus.
 *
 * With mapHelpers, the AI composes pins/routes/labels on top of *real* country and
 * state shapes derived from Mike Bostock's public-domain TopoJSON atlases, projected
 * at runtime via d3-geo.
 *
 * The AI never sees the raw geometry — it just calls functions like
 * `mapHelpers.getCountryPath("US", { width: 1920, height: 1080 })`.
 */

import {
  geoPath,
  geoMercator,
  geoEquirectangular,
  geoNaturalEarth1,
  geoAlbers,
  geoAlbersUsa,
  type GeoProjection,
  type GeoPermissibleObjects,
} from "d3-geo";
import { feature } from "topojson-client";
import worldTopo from "world-atlas/countries-110m.json";
import usTopo from "us-atlas/states-10m.json";
import type { FeatureCollection, Feature, Geometry } from "geojson";

// ---------------------------------------------------------------------------
// Country alpha-2 → ISO 3166-1 numeric code (world-atlas uses numeric IDs)
// Covers the ~120 countries users will actually animate on a map.
// ---------------------------------------------------------------------------
const COUNTRY_ALPHA2_TO_NUMERIC: Record<string, string> = {
  US: "840", CA: "124", MX: "484", BR: "076", AR: "032", CL: "152", CO: "170",
  PE: "604", VE: "862", UY: "858", BO: "068", EC: "218", PY: "600",
  GB: "826", FR: "250", DE: "276", IT: "380", ES: "724", PT: "620", NL: "528",
  BE: "056", CH: "756", AT: "040", SE: "752", NO: "578", FI: "246", DK: "208",
  IE: "372", PL: "616", CZ: "203", SK: "703", HU: "348", RO: "642", BG: "100",
  GR: "300", HR: "191", SI: "705", RS: "688", BA: "070", AL: "008", MK: "807",
  LT: "440", LV: "428", EE: "233", IS: "352", LU: "442", UA: "804", BY: "112",
  MD: "498", RU: "643", TR: "792",
  CN: "156", JP: "392", KR: "410", KP: "408", IN: "356", PK: "586", BD: "050",
  LK: "144", NP: "524", BT: "064", MM: "104", TH: "764", VN: "704", LA: "418",
  KH: "116", MY: "458", SG: "702", ID: "360", PH: "608", TW: "158", MN: "496",
  KZ: "398", UZ: "860", TM: "795", KG: "417", TJ: "762", AF: "004",
  IR: "364", IQ: "368", SY: "760", LB: "422", IL: "376", JO: "400", SA: "682",
  YE: "887", OM: "512", AE: "784", QA: "634", BH: "048", KW: "414", PS: "275",
  EG: "818", LY: "434", TN: "788", DZ: "012", MA: "504", SD: "729", SS: "728",
  ET: "231", ER: "232", SO: "706", KE: "404", UG: "800", TZ: "834", RW: "646",
  BI: "108", CD: "180", CG: "178", CF: "140", TD: "148", CM: "120", NG: "566",
  NE: "562", BF: "854", ML: "466", SN: "686", GH: "288", CI: "384", LR: "430",
  SL: "694", GN: "324", GM: "270", MR: "478", GA: "266", GQ: "226", ZA: "710",
  NA: "516", BW: "072", ZW: "716", ZM: "894", MZ: "508", AO: "024", MG: "450",
  AU: "036", NZ: "554", PG: "598", FJ: "242", SB: "090", NC: "540", VU: "548",
  CU: "192", DO: "214", HT: "332", JM: "388", PR: "630", TT: "780", BS: "044",
  GL: "304", CY: "196",
};

// US state abbrev → FIPS code (us-atlas states-10m uses FIPS IDs).
const US_STATE_ABBR_TO_FIPS: Record<string, string> = {
  AL: "01", AK: "02", AZ: "04", AR: "05", CA: "06", CO: "08", CT: "09",
  DE: "10", FL: "12", GA: "13", HI: "15", ID: "16", IL: "17", IN: "18",
  IA: "19", KS: "20", KY: "21", LA: "22", ME: "23", MD: "24", MA: "25",
  MI: "26", MN: "27", MS: "28", MO: "29", MT: "30", NE: "31", NV: "32",
  NH: "33", NJ: "34", NM: "35", NY: "36", NC: "37", ND: "38", OH: "39",
  OK: "40", OR: "41", PA: "42", RI: "44", SC: "45", SD: "46", TN: "47",
  TX: "48", UT: "49", VT: "50", VA: "51", WA: "53", WV: "54", WI: "55",
  WY: "56", DC: "11",
};

// ---------------------------------------------------------------------------
// Parse TopoJSON → GeoJSON FeatureCollections once (module-level cache).
// ---------------------------------------------------------------------------
const worldFeatures = feature(
  worldTopo as unknown as Parameters<typeof feature>[0],
  (worldTopo as unknown as { objects: { countries: unknown } }).objects
    .countries as Parameters<typeof feature>[1]
) as unknown as FeatureCollection;

const usStateFeatures = feature(
  usTopo as unknown as Parameters<typeof feature>[0],
  (usTopo as unknown as { objects: { states: unknown } }).objects
    .states as Parameters<typeof feature>[1]
) as unknown as FeatureCollection;

// ---------------------------------------------------------------------------
// Projection resolver
// ---------------------------------------------------------------------------
export type ProjectionName =
  | "mercator"
  | "equirectangular"
  | "naturalEarth"
  | "albers"
  | "albersUsa";

function makeProjection(name: ProjectionName): GeoProjection {
  switch (name) {
    case "mercator":
      return geoMercator();
    case "equirectangular":
      return geoEquirectangular();
    case "naturalEarth":
      return geoNaturalEarth1();
    case "albers":
      return geoAlbers();
    case "albersUsa":
      return geoAlbersUsa();
  }
}

// ---------------------------------------------------------------------------
// Feature lookup
// ---------------------------------------------------------------------------
function findWorldFeature(key: string): Feature<Geometry> | null {
  const normalized = key.trim().toUpperCase();
  const numeric = COUNTRY_ALPHA2_TO_NUMERIC[normalized] ?? normalized;
  for (const f of worldFeatures.features) {
    if (f.id === numeric || f.id === Number(numeric)) return f as Feature<Geometry>;
    const name = (f.properties as { name?: string } | null)?.name;
    if (name && name.toUpperCase() === normalized) return f as Feature<Geometry>;
  }
  return null;
}

function findUsStateFeature(key: string): Feature<Geometry> | null {
  const normalized = key.trim().toUpperCase();
  const fips = US_STATE_ABBR_TO_FIPS[normalized] ?? normalized;
  for (const f of usStateFeatures.features) {
    if (f.id === fips || f.id === Number(fips)) return f as Feature<Geometry>;
    const name = (f.properties as { name?: string } | null)?.name;
    if (name && name.toUpperCase() === normalized) return f as Feature<Geometry>;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Public API — the shape injected into generated preset code as `mapHelpers`.
// ---------------------------------------------------------------------------

export interface MapHelperBounds {
  width: number;
  height: number;
  projection?: ProjectionName;
  padding?: number;
}

export interface CountryPathResult {
  /** ISO 3166-1 numeric code */
  id: string;
  /** Common name (e.g. "United States of America") */
  name: string;
  /** SVG path d attribute */
  d: string;
  /** Centroid in projected viewBox coordinates [x, y] */
  centroid: [number, number];
}

export interface PinProjection {
  /** Projected x coordinate within the viewBox */
  x: number;
  /** Projected y coordinate within the viewBox */
  y: number;
  /** True if the point is outside the projected viewport (clipped) */
  clipped: boolean;
}

function fitAndRender(
  features: GeoPermissibleObjects,
  bounds: MapHelperBounds
): { projection: GeoProjection; path: ReturnType<typeof geoPath> } {
  const padding = bounds.padding ?? 20;
  const projection = makeProjection(bounds.projection ?? "naturalEarth");
  projection.fitExtent(
    [
      [padding, padding],
      [bounds.width - padding, bounds.height - padding],
    ],
    features
  );
  return { projection, path: geoPath(projection) };
}

/**
 * Get the SVG path for a single country, projected into the given viewBox.
 *
 * @example
 *   mapHelpers.getCountryPath("US", { width: 1920, height: 1080 })
 *   // → { id: "840", name: "United States of America", d: "M...", centroid: [960, 540] }
 */
export function getCountryPath(
  country: string,
  bounds: MapHelperBounds
): CountryPathResult | null {
  const feat = findWorldFeature(country);
  if (!feat) return null;
  const { path } = fitAndRender(feat, bounds);
  const d = path(feat) ?? "";
  const centroid = path.centroid(feat);
  return {
    id: String(feat.id ?? ""),
    name: ((feat.properties as { name?: string } | null)?.name as string) ?? country,
    d,
    centroid,
  };
}

/**
 * Get all world countries as an array of { id, name, d, centroid }.
 * Use this to render a full world map background.
 *
 * @example
 *   const countries = mapHelpers.getWorldCountries({ width: 1920, height: 1080 });
 *   countries.map(c => <path key={c.id} d={c.d} />)
 */
export function getWorldCountries(bounds: MapHelperBounds): CountryPathResult[] {
  const { path } = fitAndRender(worldFeatures, bounds);
  const out: CountryPathResult[] = [];
  for (const f of worldFeatures.features) {
    const d = path(f as Feature<Geometry>);
    if (!d) continue;
    const centroid = path.centroid(f as Feature<Geometry>);
    out.push({
      id: String(f.id ?? ""),
      name: ((f.properties as { name?: string } | null)?.name as string) ?? "",
      d,
      centroid,
    });
  }
  return out;
}

/**
 * Get the SVG path for a single US state (by postal code or full name),
 * projected into the given viewBox using Albers USA by default.
 *
 * @example
 *   mapHelpers.getStatePath("CA", { width: 1920, height: 1080 })
 */
export function getStatePath(
  state: string,
  bounds: MapHelperBounds
): CountryPathResult | null {
  const feat = findUsStateFeature(state);
  if (!feat) return null;
  const boundsWithDefault = { ...bounds, projection: bounds.projection ?? ("albersUsa" as ProjectionName) };
  const { path } = fitAndRender(feat, boundsWithDefault);
  const d = path(feat) ?? "";
  const centroid = path.centroid(feat);
  return {
    id: String(feat.id ?? ""),
    name: ((feat.properties as { name?: string } | null)?.name as string) ?? state,
    d,
    centroid,
  };
}

/**
 * Get all US states as an array of { id, name, d, centroid }.
 */
export function getUsStates(bounds: MapHelperBounds): CountryPathResult[] {
  const boundsWithDefault = { ...bounds, projection: bounds.projection ?? ("albersUsa" as ProjectionName) };
  const { path } = fitAndRender(usStateFeatures, boundsWithDefault);
  const out: CountryPathResult[] = [];
  for (const f of usStateFeatures.features) {
    const d = path(f as Feature<Geometry>);
    if (!d) continue;
    const centroid = path.centroid(f as Feature<Geometry>);
    out.push({
      id: String(f.id ?? ""),
      name: ((f.properties as { name?: string } | null)?.name as string) ?? "",
      d,
      centroid,
    });
  }
  return out;
}

/**
 * Project a [longitude, latitude] point into viewBox coordinates,
 * sharing the same projection a getWorldCountries / getUsStates call
 * would produce for the same bounds.
 *
 * Use this to place pins, routes, and labels on top of real country shapes.
 *
 * @example
 *   const nyc = mapHelpers.projectLatLon([-74.006, 40.7128], { width: 1920, height: 1080 });
 *   <circle cx={nyc.x} cy={nyc.y} r={6} fill="red" />
 */
export function projectLatLon(
  lonLat: [number, number],
  bounds: MapHelperBounds,
  dataset: "world" | "us" = "world"
): PinProjection {
  const collection = dataset === "us" ? usStateFeatures : worldFeatures;
  const boundsWithDefault = {
    ...bounds,
    projection:
      bounds.projection ?? (dataset === "us" ? ("albersUsa" as ProjectionName) : ("naturalEarth" as ProjectionName)),
  };
  const { projection } = fitAndRender(collection, boundsWithDefault);
  const projected = projection(lonLat);
  if (!projected) return { x: 0, y: 0, clipped: true };
  return { x: projected[0], y: projected[1], clipped: false };
}

/**
 * Project a route (array of [lon, lat] points) into an SVG path string,
 * optionally as a smoothed great-circle-ish curve.
 *
 * @example
 *   const route = mapHelpers.projectRoute([[-74,40.7], [-0.1,51.5], [139.7,35.7]], bounds);
 *   <path d={route.d} />
 */
export function projectRoute(
  points: Array<[number, number]>,
  bounds: MapHelperBounds,
  dataset: "world" | "us" = "world"
): { d: string; projectedPoints: Array<[number, number]> } {
  const projectedPoints = points
    .map((p) => {
      const { x, y, clipped } = projectLatLon(p, bounds, dataset);
      return clipped ? null : ([x, y] as [number, number]);
    })
    .filter((p): p is [number, number] => p !== null);
  if (projectedPoints.length === 0) return { d: "", projectedPoints: [] };
  const d = projectedPoints.map((p, i) => `${i === 0 ? "M" : "L"} ${p[0]} ${p[1]}`).join(" ");
  return { d, projectedPoints };
}

// ---------------------------------------------------------------------------
// Bundle the whole API into a single object for injection into the runtime scope.
// ---------------------------------------------------------------------------
export const mapHelpers = {
  getCountryPath,
  getWorldCountries,
  getStatePath,
  getUsStates,
  projectLatLon,
  projectRoute,
};

export type MapHelpers = typeof mapHelpers;
