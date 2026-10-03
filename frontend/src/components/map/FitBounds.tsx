import { useEffect } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";
import type { LatLng } from "@/lib/routeMapHelpers";

export default function FitBounds({ points }: { points: LatLng[] }) {
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
