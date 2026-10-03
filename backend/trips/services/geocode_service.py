"""Free-text city -> (lat, lng) via Nominatim with in-memory cache + fallback."""

import logging

import requests
from django.conf import settings

logger = logging.getLogger(__name__)

_cache: dict[str, dict] = {}

# Hardcoded fallback so planning never fails when Nominatim is down.
# Coordinates are city centres (lat, lng).
FALLBACK = {
    # "chicago, il": {"lat": 41.8781, "lng": -87.6298, "display": "Chicago, IL"},
    # "chicago": {"lat": 41.8781, "lng": -87.6298, "display": "Chicago, IL"},
    # "atlanta, ga": {"lat": 33.7490, "lng": -84.3880, "display": "Atlanta, GA"},
    # "atlanta": {"lat": 33.7490, "lng": -84.3880, "display": "Atlanta, GA"},
    # "dallas, tx": {"lat": 32.7767, "lng": -96.7970, "display": "Dallas, TX"},
    # "dallas": {"lat": 32.7767, "lng": -96.7970, "display": "Dallas, TX"},
    # "memphis, tn": {"lat": 35.1495, "lng": -90.0490, "display": "Memphis, TN"},
    # "memphis": {"lat": 35.1495, "lng": -90.0490, "display": "Memphis, TN"},
    # "nashville, tn": {"lat": 36.1627, "lng": -86.7816, "display": "Nashville, TN"},
    # "nashville": {"lat": 36.1627, "lng": -86.7816, "display": "Nashville, TN"},
    # "houston, tx": {"lat": 29.7604, "lng": -95.3698, "display": "Houston, TX"},
    # "houston": {"lat": 29.7604, "lng": -95.3698, "display": "Houston, TX"},
    "los angeles, ca": {"lat": 34.0522, "lng": -118.2437, "display": "Los Angeles, CA"},
    "new york, ny": {"lat": 40.7128, "lng": -74.0060, "display": "New York, NY"},
    "denver, co": {"lat": 39.7392, "lng": -104.9903, "display": "Denver, CO"},
    "kansas city, mo": {"lat": 39.0997, "lng": -94.5786, "display": "Kansas City, MO"},
    "st. louis, mo": {"lat": 38.6270, "lng": -90.1994, "display": "St. Louis, MO"},
    "st louis, mo": {"lat": 38.6270, "lng": -90.1994, "display": "St. Louis, MO"},
    "indianapolis, in": {"lat": 39.7684, "lng": -86.1581, "display": "Indianapolis, IN"},
    "birmingham, al": {"lat": 33.5207, "lng": -86.8025, "display": "Birmingham, AL"},
    "little rock, ar": {"lat": 34.7465, "lng": -92.2896, "display": "Little Rock, AR"},
    "oklahoma city, ok": {"lat": 35.4676, "lng": -97.5164, "display": "Oklahoma City, OK"},
    "phoenix, az": {"lat": 33.4484, "lng": -112.0740, "display": "Phoenix, AZ"},
    "seattle, wa": {"lat": 47.6062, "lng": -122.3321, "display": "Seattle, WA"},
    "miami, fl": {"lat": 25.7617, "lng": -80.1918, "display": "Miami, FL"},
}


class GeocodeError(ValueError):
    pass


def _nominatim_search(query: str) -> list:
    """Single Nominatim lookup. Global — no countrycodes filter."""
    resp = requests.get(
        settings.NOMINATIM_BASE_URL,
        params={"q": query, "format": "json", "limit": 1},
        headers={"User-Agent": settings.NOMINATIM_USER_AGENT},
        timeout=settings.GEOCODE_TIMEOUT_S,
    )
    resp.raise_for_status()
    data = resp.json()
    return data if isinstance(data, list) else []


def _candidate_queries(q: str) -> list[str]:
    """Full query first, then progressively shorter tails.

    e.g. "Jebel Ali Free Zone, Dubai, UAE" -> "Dubai, UAE" -> "UAE".
    Handles overly-specific industrial-zone / port names that Nominatim
    only knows under a broader area.
    """
    cands = [q]
    parts = [p.strip() for p in q.split(",") if p.strip()]
    for i in range(1, len(parts)):
        short = ", ".join(parts[i:])
        if short and short not in cands:
            cands.append(short)
        if len(cands) >= 3:
            break
    return cands


def _fallback_lookup(query: str) -> dict | None:
    key = query.strip().lower()
    if key in FALLBACK:
        f = FALLBACK[key]
        return {"name": f["display"], "lat": f["lat"], "lng": f["lng"], "fallback": True}
    # try bare city match ("atlanta" in "atlanta, georgia")
    for k, f in FALLBACK.items():
        city = k.split(",")[0]
        if key == city or key.startswith(city + " ") or key.startswith(city + ","):
            return {"name": f["display"], "lat": f["lat"], "lng": f["lng"], "fallback": True}
    return None


def geocode(query: str) -> dict:
    """Resolve a free-text place to {name, lat, lng}.

    Raises GeocodeError (caller maps to 422) when nothing is found.
    Never raises on transport errors — falls back to the hardcoded dict.
    """
    q = (query or "").strip()
    if not q:
        raise GeocodeError("Empty location")
    key = q.lower()
    if key in _cache:
        return _cache[key]

    # Fast path: known cities avoid a network round-trip
    fb = _fallback_lookup(q)
    try:
        for cand in _candidate_queries(q):
            try:
                data = _nominatim_search(cand)
            except Exception as exc:  # network down -> fallback
                logger.warning("Nominatim failed for %r: %s", cand, exc)
                break
            if data:
                top = data[0]
                result = {
                    "name": q,
                    "lat": float(top["lat"]),
                    "lng": float(top["lon"]),
                    "fallback": False,
                }
                _cache[key] = result
                return result
    except Exception as exc:  # defensive: never 500 on geocode
        logger.warning("Nominatim failed for %r: %s", q, exc)

    if fb:
        _cache[key] = fb
        return fb
    raise GeocodeError(f"Unknown location: {q!r}. Try 'City, Country' e.g. 'Chicago, IL' or 'Dubai, UAE'.")


def clear_cache():
    _cache.clear()
