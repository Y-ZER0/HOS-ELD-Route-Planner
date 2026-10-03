import { useEffect, useMemo } from "react";
import { MapContainer, TileLayer, Polyline, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import polyline from "polyline";
import { useAppStore } from "@/stores/useAppStore";
import EmptyState from "@/components/EmptyState";
import { stopArrival, stopDuration, stopName, stopTypeUpper } from "@/lib/types";

const TYPE_COLOR: Record<string, string> = {
  ORIGIN: "#22d3ee",
  PRETRIP: "#fb923c",
  PICKUP: "#fb923c",
  DROPOFF: "#34d399",
  FUEL: "#fbbf24",
  REST_10HR: "#a78bfa",
  REST_30MIN: "#94a3b8",
};

const TYPE_LABEL: Record<string, string> = {
  ORIGIN: "Origin",
  PRETRIP: "Pre-trip",
  PICKUP: "Pickup",
  DROPOFF: "Drop-off",
  FUEL: "Fuel",
  REST_10HR: "10hr Rest",
  REST_30MIN: "30min Break",
};

type LatLng = [number, number];

function getLat(s: { latitude?: unknown; lat?: unknown }): number | undefined {
  if (typeof s.latitude === "number" && Number.isFinite(s.latitude)) return s.latitude;
  if (typeof s.lat === "number" && Number.isFinite(s.lat)) return s.lat;
  const n = Number(s.latitude ?? s.lat);
  return Number.isFinite(n) ? n : undefined;
}

function getLng(s: { longitude?: unknown; lng?: unknown }): number | undefined {
  if (typeof s.longitude === "number" && Number.isFinite(s.longitude)) return s.longitude;
  if (typeof s.lng === "number" && Number.isFinite(s.lng)) return s.lng;
  const n = Number(s.longitude ?? s.lng);
  return Number.isFinite(n) ? n : undefined;
}

/** True only for pure driving legs (excluded from markers). Every ON-duty /
 *  non-driving stop — including FUEL — must stay visible. */
function isDrivingChunk(s: { stopType?: string; stop_type?: string }): boolean {
  if ((s.stopType ?? "").toLowerCase() === "driving") return true;
  return stopTypeUpper(s as never) === "DRIVING";
}

function makeDotIcon(color: string, active = false): L.DivIcon {
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

function FitBounds({ points }: { points: LatLng[] }) {
  const map = useMap();
  useEffect(() => {
    if (points.length === 0) return;
    if (points.length === 1) {
      map.setView(points[0], 6, { animate: false });
      return;
    }
    const bounds = L.latLngBounds(points.map((p) => L.latLng(p[0], p[1])));
    map.fitBounds(bounds, { padding: [32, 32], animate: false });
  }, [map, points]);
  return null;
}

function fmtArrival(iso: string): string {
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

export default function RouteMap() {
  const activeTrip = useAppStore((s) => s.activeTrip);
  const trip = activeTrip?.trip;

  const routePts = useMemo<LatLng[]>(() => {
    if (!trip) return [];
    try {
      const enc = trip.encodedPolyline;
      if (enc && enc.length > 10) {
        const decoded = polyline.decode(enc) as LatLng[];
        const valid = decoded.filter(
          (p) =>
            Array.isArray(p) &&
            p.length >= 2 &&
            Number.isFinite(p[0]) &&
            Number.isFinite(p[1]) &&
            Math.abs(p[0]) <= 90 &&
            Math.abs(p[1]) <= 180,
        );
        if (valid.length >= 2) {
          const step = Math.max(1, Math.floor(valid.length / 600));
          return valid.filter((_, i) => i % step === 0 || i === valid.length - 1);
        }
      }
    } catch {
      /* fall through to stop fallback */
    }
    return (trip.stops ?? [])
      .map((s) => ({ lat: getLat(s as never), lng: getLng(s as never) }))
      .filter(
        (p): p is { lat: number; lng: number } =>
          typeof p.lat === "number" &&
          Number.isFinite(p.lat) &&
          typeof p.lng === "number" &&
          Number.isFinite(p.lng) &&
          Math.abs(p.lat) <= 90 &&
          Math.abs(p.lng) <= 180,
      )
      .map((p) => [p.lat, p.lng] as LatLng);
  }, [trip]);

  const markers = useMemo(() => {
    const all = (trip?.stops ?? []).filter((s) => {
      const lat = getLat(s as never);
      const lng = getLng(s as never);
      if (typeof lat !== "number" || !Number.isFinite(lat)) return false;
      if (typeof lng !== "number" || !Number.isFinite(lng)) return false;
      // Exclude ONLY driving legs — keep ORIGIN/PRETRIP/PICKUP/DROPOFF/FUEL/REST_*.
      if (isDrivingChunk(s as never)) return false;
      return true;
    });
    // Render non-fuel first so FUEL / PICKUP / DROPOFF paint on top when stacked.
    const rank = (s: (typeof all)[number]) => {
      const t = stopTypeUpper(s);
      if (t === "FUEL") return 3;
      if (t === "PICKUP" || t === "DROPOFF") return 2;
      if (t === "PRETRIP") return 1;
      return 0;
    };
    return [...all].sort((a, b) => rank(a) - rank(b));
  }, [trip]);

  // Nudge markers that share identical coords so stacked ON-duty stops
  // (e.g. fuel at the same truck stop as a rest) stay clickable/visible.
  const markerPositions = useMemo(() => {
    const seen = new Map<string, number>();
    return markers.map((s) => {
      const lat = getLat(s as never) as number;
      const lng = getLng(s as never) as number;
      const key = `${lat.toFixed(5)},${lng.toFixed(5)}`;
      const n = seen.get(key) ?? 0;
      seen.set(key, n + 1);
      if (n === 0) return [lat, lng] as LatLng;
      const angle = (n * 2.4) % (Math.PI * 2);
      const r = 0.035 * n;
      return [lat + r * Math.cos(angle), lng + r * Math.sin(angle)] as LatLng;
    });
  }, [markers]);

  const fitPoints: LatLng[] = useMemo(() => {
    const pts: LatLng[] = [...routePts, ...markerPositions];
    return pts;
  }, [routePts, markerPositions]);

  const icons = useMemo(() => {
    const map = new Map<string, L.DivIcon>();
    Object.entries(TYPE_COLOR).forEach(([k, c]) => map.set(k, makeDotIcon(c)));
    // Slightly larger dot for fuel so ON-duty fuel stops stand out.
    map.set("FUEL", makeDotIcon(TYPE_COLOR.FUEL, true));
    return map;
  }, []);

  if (!trip) {
    return (
      <EmptyState
        title="No trip planned yet"
        hint="Enter the current, pickup, and drop-off locations, then generate a compliant route to see it on the map."
        className="h-[380px]"
      />
    );
  }

  const center: LatLng =
    routePts.length > 0
      ? routePts[Math.floor(routePts.length / 2)]
      : markerPositions.length > 0
        ? markerPositions[0]
        : [39.8283, -98.5795];

  return (
    <section className="panel overflow-hidden">
      {/* header — separate block above the map so nothing overlaps */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-2.5">
        <div className="min-w-0">
          <h2 className="truncate text-[13px] font-semibold text-foreground">
            Planned Route · {trip.currentLocation} → {trip.pickupLocation} → {trip.dropOffLocation}
          </h2>
          <p className="mt-0.5 text-[11px] text-muted-foreground tabular">
            {Math.round(trip.totalDistanceMiles).toLocaleString()} mi · {trip.totalTripDurationHours.toFixed(1)} hrs
            {trip.routeFallback ? " · fallback geometry" : ""}
          </p>
        </div>
        <span className="shrink-0 rounded-full border border-border bg-secondary px-2.5 py-1 text-[10px] font-medium text-secondary-foreground tabular">
          {routePts.length} pts · {markers.length} stops
        </span>
      </div>

      {/* map — isolated stacking context so Leaflet panes can't cover other panels */}
      <div className="relative isolate z-0 h-[380px] w-full bg-[#e5e7eb]">
        <MapContainer
          center={center}
          zoom={5}
          scrollWheelZoom
          className="h-full w-full"
          style={{ background: "#e5e7eb" }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            maxZoom={19}
          />
          <FitBounds points={fitPoints} />
          {routePts.length >= 2 && (
            <>
              <Polyline positions={routePts} pathOptions={{ color: "#22d3ee", weight: 7, opacity: 0.25, lineCap: "round", lineJoin: "round" }} />
              <Polyline positions={routePts} pathOptions={{ color: "#22d3ee", weight: 3, opacity: 0.95, lineCap: "round", lineJoin: "round" }} />
            </>
          )}
          {markers.map((s, i) => {
            const t = stopTypeUpper(s);
            const color = TYPE_COLOR[t] ?? "#22d3ee";
            const pos: LatLng = markerPositions[i] ?? [(getLat(s as never) as number), (getLng(s as never) as number)];
            const onTop = t === "FUEL" || t === "PICKUP" || t === "DROPOFF";
            return (
              <Marker
                key={`${s.stopSequence}-${i}`}
                position={pos}
                icon={icons.get(t) ?? makeDotIcon(color)}
                zIndexOffset={onTop ? 1000 : 0}
              >
                <Popup>
                  <div style={{ minWidth: 180 }}>
                    <p style={{ fontSize: 11, fontWeight: 700, margin: 0 }}>
                      #{s.stopSequence} · {TYPE_LABEL[t] ?? t}
                    </p>
                    <p style={{ fontSize: 12, fontWeight: 600, margin: "2px 0" }}>{stopName(s)}</p>
                    <p style={{ fontSize: 11, opacity: 0.75, margin: 0 }}>
                      {fmtArrival(stopArrival(s))}
                      {stopDuration(s) ? ` · ${stopDuration(s)} min` : ""}
                    </p>
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>

        {/* legend — inside map frame, pointer-events safe */}
        <div className="absolute bottom-3 left-3 z-[500] flex max-w-[calc(100%-24px)] flex-wrap items-center gap-x-3 gap-y-1 rounded-md border border-white/10 bg-black/70 px-2.5 py-1.5 text-[10px] text-slate-200 backdrop-blur">
          {(
            [
              ["Origin", "#22d3ee"],
              ["Pickup", "#fb923c"],
              ["Fuel", "#fbbf24"],
              ["10hr Rest", "#a78bfa"],
              ["30min Break", "#94a3b8"],
              ["Drop-off", "#34d399"],
            ] as [string, string][]
          ).map(([label, color]) => (
            <span key={label} className="flex items-center gap-1.5 whitespace-nowrap">
              <span className="inline-block h-2 w-2 rounded-full" style={{ background: color }} />
              {label}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
