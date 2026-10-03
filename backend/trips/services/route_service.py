"""OSRM routing with per-leg split + haversine fallback. Never raises 500."""

import logging
import math

import polyline
import requests
from django.conf import settings

logger = logging.getLogger(__name__)

MILES_PER_METER = 0.000621371


def haversine_miles(lat1, lng1, lat2, lng2) -> float:
    r = 3958.8  # earth radius miles
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlmb = math.radians(lng2 - lng1)
    a = math.sin(dphi / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dlmb / 2) ** 2
    return 2 * r * math.asin(math.sqrt(a))


def _osrm_leg(coords: list[tuple[float, float]]) -> dict | None:
    """coords = [(lat, lng), ...]. Returns {distance_miles, duration_hours, polyline} or None."""
    coord_str = ";".join(f"{lng},{lat}" for lat, lng in coords)
    url = (
        f"{settings.OSRM_BASE_URL}/route/v1/driving/"
        f"{coord_str}?overview=full&geometries=polyline"
    )
    try:
        resp = requests.get(url, timeout=settings.OSRM_TIMEOUT_S)
        resp.raise_for_status()
        data = resp.json()
        routes = data.get("routes")
        if not routes:
            return None
        r = routes[0]
        return {
            "distance_miles": r["distance"] * MILES_PER_METER,
            "duration_hours": r["duration"] / 3600.0,
            "polyline": r.get("geometry", ""),
        }
    except Exception as exc:
        logger.warning("OSRM leg failed %s: %s", coord_str, exc)
        return None
 

def _straight_polyline(points: list[tuple[float, float]]) -> str:
    # polyline lib expects [(lat, lng)]
    return polyline.encode([(lat, lng) for lat, lng in points])


def get_route(origin: dict, pickup: dict, dropoff: dict) -> dict:
    """Two separate OSRM legs (origin->pickup, pickup->dropoff) for a true split.

    Returns {distance_miles, duration_hours, polyline, legs[], fallback}.
    Falls back to haversine + straight-line polyline per leg on any failure.
    """
    legs = []
    fallback = False

    o = (origin["lat"], origin["lng"])
    p = (pickup["lat"], pickup["lng"])
    d = (dropoff["lat"], dropoff["lng"])

    for a, b in [(o, p), (p, d)]:
        info = _osrm_leg([a, b])
        if info is None:
            fallback = True
            dist = haversine_miles(a[0], a[1], b[0], b[1]) * 1.2  # road circuity
            dur = dist / 55.0
            info = {
                "distance_miles": dist,
                "duration_hours": dur,
                "polyline": _straight_polyline([a, b]),
            }
        legs.append(info)

    # Stitch polylines: decode both, concat (drop duplicate joint), re-encode.
    try:
        pts: list[tuple[float, float]] = []
        for i, leg in enumerate(legs):
            decoded = polyline.decode(leg["polyline"]) if leg["polyline"] else []
            if not decoded:
                continue
            if i > 0 and pts and decoded:
                decoded = decoded[1:]
            pts.extend(decoded)
        if not pts:
            pts = [o, p, d]
            fallback = True
        full_poly = polyline.encode(pts)
    except Exception:
        full_poly = _straight_polyline([o, p, d])
        fallback = True

    total_dist = sum(leg["distance_miles"] for leg in legs)
    total_dur = sum(leg["duration_hours"] for leg in legs)

    return {
        "distance_miles": round(total_dist, 2),
        "duration_hours": round(total_dur, 2),
        "polyline": full_poly,
        "legs": [
            {
                "distance_miles": round(leg["distance_miles"], 2),
                "duration_hours": round(leg["duration_hours"], 2),
            }
            for leg in legs
        ],
        "fallback": fallback,
    }
