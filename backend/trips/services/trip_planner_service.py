"""Orchestrates geocode -> route -> HOS for the plan endpoint."""

from trips.services import geocode_service, hos_engine, route_service


def _as_location(value, field_name: str) -> dict:
    """Accept a free-text string or {name, lat, lng} object.

    Edge cases (see backend/EDGE_CASES.md):
    - empty/whitespace string -> GeocodeError (mapped to 422, not 400)
    - wrong type (int/list/None) -> ValueError (400), never a crash
    - dict without lat/lng -> ValueError (400)
    - non-numeric or out-of-range lat/lng -> ValueError (400)
    """
    if isinstance(value, str):
        if not value.strip():
            raise geocode_service.GeocodeError("Empty location")
        g = geocode_service.geocode(value)
        return {"name": value.strip(), "lat": g["lat"], "lng": g["lng"]}
    if isinstance(value, dict):
        if "lat" not in value or "lng" not in value:
            raise ValueError(f"{field_name} object needs lat/lng or a string")
        try:
            lat = float(value["lat"])
            lng = float(value["lng"])
        except (TypeError, ValueError):
            raise ValueError(f"{field_name} lat/lng must be numbers.")
        if not (-90 <= lat <= 90 and -180 <= lng <= 180):
            raise ValueError(f"{field_name} lat/lng out of range.")
        name = value.get("name") or value.get("locationName") or field_name
        return {"name": str(name), "lat": lat, "lng": lng}
    raise ValueError(f"{field_name} must be a string or name/lat/lng object")


def _pick(payload: dict, *keys):
    """Return the first key present with a non-None value (empty string counts).

    NOTE: empty string is *not* treated as missing — it flows into geocode
    and becomes a 422 (unknown/empty location) instead of a 400.
    """
    for k in keys:
        if payload.get(k) is not None:
            return payload.get(k)
    return None


def plan_trip(payload: dict):
    """payload: raw request dict (any accepted key variant).

    Returns dict with driver_loc, origin, pickup, dropoff, route_info, stops, logs, totals.
    Raises ValueError / GeocodeError on bad input.
    """
    if not isinstance(payload, dict):
        raise ValueError(
            "Request body must be a JSON object with currentLocation, "
            "pickupLocation, dropOffLocation, currentCycleHoursUsed."
        )
    current = _pick(payload, "currentLocation", "current_location", "origin")
    pickup_raw = _pick(payload, "pickupLocation", "pickup_location", "pickup")
    dropoff_raw = _pick(
        payload, "dropOffLocation", "dropoffLocation", "dropoff_location", "dropoff"
    )
    cycle_raw = _pick(
        payload,
        "currentCycleHoursUsed",
        "startCycleHrsUsed",
        "start_cycle_hours",
        "current_cycle_hours",
    )
    if current is None or pickup_raw is None or dropoff_raw is None or cycle_raw is None:
        raise ValueError(
            "Missing fields. Required: currentLocation, pickupLocation, "
            "dropOffLocation, currentCycleHoursUsed (0-70)."
        )
    try:
        cycle = float(cycle_raw)
    except (TypeError, ValueError):
        raise ValueError("currentCycleHoursUsed must be a number 0-70.")
    if not (0 <= cycle <= 70):
        raise ValueError("currentCycleHoursUsed must be between 0 and 70.")

    origin = _as_location(current, "currentLocation")
    pickup = _as_location(pickup_raw, "pickupLocation")
    dropoff = _as_location(dropoff_raw, "dropOffLocation")

    route_info = route_service.get_route(origin, pickup, dropoff)
    stops, logs, totals = hos_engine.calculate_itinerary_and_logs(
        origin, pickup, dropoff, cycle, route_info
    )
    return {
        "origin": origin,
        "pickup": pickup,
        "dropoff": dropoff,
        "start_cycle_hours": cycle,
        "route_info": route_info,
        "stops": stops,
        "logs": logs,
        "totals": totals,
    }
