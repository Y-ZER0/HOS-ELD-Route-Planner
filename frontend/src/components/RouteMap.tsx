import { useMemo } from "react";
import { MapContainer, TileLayer, Polyline, Marker, Popup } from "react-leaflet";
import { useAppStore } from "@/stores/useAppStore";
import EmptyState from "@/components/EmptyState";
import FitBounds from "@/components/map/FitBounds";
import {
  DEFAULT_CENTER,
  MAP_LEGEND,
  TYPE_LABEL,
  buildMarkerIcons,
  formatArrival,
  getLat,
  getLng,
  getMarkerColor,
  isPriorityMarker,
  makeDotIcon,
  nudgeOverlappingMarkers,
  resolveRoutePoints,
  selectMapMarkers,
  type LatLng,
} from "@/lib/routeMapHelpers";
import { stopArrival, stopDuration, stopName, stopTypeUpper } from "@/lib/types";

export default function RouteMap() {
  const activeTrip = useAppStore((s) => s.activeTrip);
  const trip = activeTrip?.trip;

  const routePts = useMemo<LatLng[]>(
    () => (trip ? resolveRoutePoints(trip.encodedPolyline, trip.stops) : []),
    [trip],
  );

  const markers = useMemo(() => selectMapMarkers(trip?.stops), [trip]);

  // Nudge markers that share identical coords so stacked ON-duty stops
  // (e.g. fuel at the same truck stop as a rest) stay clickable/visible.
  const markerPositions = useMemo(() => nudgeOverlappingMarkers(markers), [markers]);

  const fitPoints: LatLng[] = useMemo(
    () => [...routePts, ...markerPositions],
    [routePts, markerPositions],
  );

  const icons = useMemo(() => buildMarkerIcons(), []);

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
        : DEFAULT_CENTER;

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
            const color = getMarkerColor(t);
            const pos: LatLng = markerPositions[i] ?? [(getLat(s as never) as number), (getLng(s as never) as number)];
            const onTop = isPriorityMarker(t);
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
                      {formatArrival(stopArrival(s))}
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
          {MAP_LEGEND.map(([label, color]) => (
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
