import L from "leaflet";
import polyline from "polyline";
import { stopTypeUpper, type TripStop } from "@/lib/types";

export const TYPE_COLOR: Record<string, string> = {
  ORIGIN: "#22d3ee",
  PRETRIP: "#fb923c",
  PICKUP: "#fb923c",
  DROPOFF: "#34d399",
  FUEL: "#fbbf24",
  REST_10HR: "#a78bfa",
  REST_30MIN: "#94a3b8",
};

export const TYPE_LABEL: Record<string, string> = {
  ORIGIN: "Origin",
  PRETRIP: "Pre-trip",
  PICKUP: "Pickup",
  DROPOFF: "Drop-off",
  FUEL: "Fuel",
  REST_10HR: "10hr Rest",
  REST_30MIN: "30min Break",
};

export const MAP_LEGEND: Array<[string, string]> = [
  ["Origin", "#22d3ee"],
  ["Pickup", "#fb923c"],
  ["Fuel", "#fbbf24"],
  ["10hr Rest", "#a78bfa"],
  ["30min Break", "#94a3b8"],
  ["Drop-off", "#34d399"],
];

export const DEFAULT_CENTER: LatLng = [39.8283, -98.5795];
export const MAX_ROUTE_POINTS = 600;

export type LatLng = [number, number];

type CoordLike = { latitude?: unknown; lat?: unknown; longitude?: unknown; lng?: unknown };

export function getLat(s: CoordLike): number | undefined {
  if (typeof s.latitude === "number" && Number.isFinite(s.latitude)) return s.latitude;
  if (typeof s.lat === "number" && Number.isFinite(s.lat)) return s.lat;
  const n = Number(s.latitude ?? s.lat);
  return Number.isFinite(n) ? n : undefined;
}

export function getLng(s: CoordLike): number | undefined {
  if (typeof s.longitude === "number" && Number.isFinite(s.longitude)) return s.longitude;
  if (typeof s.lng === "number" && Number.isFinite(s.lng)) return s.lng;
  const n = Number(s.longitude ?? s.lng);
  return Number.isFinite(n) ? n : undefined;
}

type StopTypeLike = { stopType?: string; stop_type?: string };

/** True only for pure driving legs (excluded from markers). Every ON-duty /
 *  non-driving stop — including FUEL — must stay visible. */
export function isDrivingChunk(s: StopTypeLike): boolean {
  if ((s.stopType ?? "").toLowerCase() === "driving") return true;
  return stopTypeUpper(s as TripStop) === "DRIVING";
}

export function makeDotIcon(color: string, active = false): L.DivIcon {
  const size = active ? 18 : 14;
  return L.divIcon({
    className: "spotter-dot-marker",
    html: `<span style="
      display:block;
      width:${size}px;height:${size}px;
      background:${color};
      border:2.5px solid #0b1222;
      border-radius:9999px;
      box-shadow:0 0 0 3px ${color}44, 0 1px 4px rgba(0,0,0,.5);
    "></span>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2],
  });
}

export function formatArrival(iso: string): string {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return (
      d.toLocaleDateString("en-US", { month: "short", day: "numeric" }) +
      ", " +
      d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
    );
  } catch {
    return iso;
  }
}

function isValidLatLng(lat: number, lng: number): boolean {
  return (
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    Math.abs(lat) <= 90 &&
    Math.abs(lng) <= 180
  );
}

/** Decode an encoded polyline, validate + downsample for rendering. */
export function decodeRoutePoints(encoded: string | undefined | null): LatLng[] {
  if (!encoded || encoded.length <= 10) return [];
  try {
    const decoded = polyline.decode(encoded) as LatLng[];
    const valid = decoded.filter(
      (p) =>
        Array.isArray(p) &&
        p.length >= 2 &&
        Number.isFinite(p[0]) &&
        Number.isFinite(p[1]) &&
        Math.abs(p[0]) <= 90 &&
        Math.abs(p[1]) <= 180,
    );
    if (valid.length < 2) return [];
    const step = Math.max(1, Math.floor(valid.length / MAX_ROUTE_POINTS));
    return valid.filter((_, i) => i % step === 0 || i === valid.length - 1);
  } catch {
    return [];
  }
}

/** Fallback geometry when no polyline is available: straight line via stops. */
export function stopsToLatLng(stops: TripStop[] | undefined | null): LatLng[] {
  return (stops ?? [])
    .map((s) => ({ lat: getLat(s as unknown as CoordLike), lng: getLng(s as unknown as CoordLike) }))
    .filter(
      (p): p is { lat: number; lng: number } =>
        typeof p.lat === "number" && typeof p.lng === "number" && isValidLatLng(p.lat, p.lng),
    )
    .map((p) => [p.lat, p.lng] as LatLng);
}

/** Resolve renderable route points: polyline first, stops fallback. */
export function resolveRoutePoints(
  encodedPolyline: string | undefined | null,
  stops: TripStop[] | undefined | null,
): LatLng[] {
  const decoded = decodeRoutePoints(encodedPolyline);
  if (decoded.length >= 2) return decoded;
  return stopsToLatLng(stops);
}

export function markerRank(s: TripStop): number {
  const t = stopTypeUpper(s);
  if (t === "FUEL") return 3;
  if (t === "PICKUP" || t === "DROPOFF") return 2;
  if (t === "PRETRIP") return 1;
  return 0;
}

/** Non-driving stops with valid coords, fuel/pickup/dropoff sorted on top. */
export function selectMapMarkers(stops: TripStop[] | undefined | null): TripStop[] {
  const all = (stops ?? []).filter((s) => {
    const lat = getLat(s as unknown as CoordLike);
    const lng = getLng(s as unknown as CoordLike);
    if (typeof lat !== "number" || !Number.isFinite(lat)) return false;
    if (typeof lng !== "number" || !Number.isFinite(lng)) return false;
    // Exclude ONLY driving legs — keep ORIGIN/PRETRIP/PICKUP/DROPOFF/FUEL/REST_*.
    if (isDrivingChunk(s as unknown as StopTypeLike)) return false;
    return true;
  });
  return [...all].sort((a, b) => markerRank(a) - markerRank(b));
}

/** Nudge markers sharing identical coords so stacked stops stay clickable. */
export function nudgeOverlappingMarkers(markers: TripStop[]): LatLng[] {
  const seen = new Map<string, number>();
  return markers.map((s) => {
    const lat = getLat(s as unknown as CoordLike) as number;
    const lng = getLng(s as unknown as CoordLike) as number;
    const key = `${lat.toFixed(5)},${lng.toFixed(5)}`;
    const n = seen.get(key) ?? 0;
    seen.set(key, n + 1);
    if (n === 0) return [lat, lng] as LatLng;
    const angle = (n * 2.4) % (Math.PI * 2);
    const r = 0.035 * n;
    return [lat + r * Math.cos(angle), lng + r * Math.sin(angle)] as LatLng;
  });
}

export function buildMarkerIcons(): Map<string, L.DivIcon> {
  const map = new Map<string, L.DivIcon>();
  Object.entries(TYPE_COLOR).forEach(([k, c]) => map.set(k, makeDotIcon(c)));
  // Slightly larger dot for fuel so ON-duty fuel stops stand out.
  map.set("FUEL", makeDotIcon(TYPE_COLOR.FUEL, true));
  return map;
}

export function getMarkerColor(stopType: string): string {
  return TYPE_COLOR[stopType] ?? "#22d3ee";
}

export function isPriorityMarker(stopType: string): boolean {
  return stopType === "FUEL" || stopType === "PICKUP" || stopType === "DROPOFF";
}
