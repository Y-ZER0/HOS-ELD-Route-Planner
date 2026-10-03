"""FMCSA HOS chunk simulation + true multi-day ELD slicing.

Rules (property-carrying, 70hr/8-day, no adverse conditions):
- 11-hr max driving per shift, within 14-hr on-duty window.
- 30-min off-duty break after 8 hrs cumulative driving.
- 10-hr off-duty/sleeper reset between shifts.
- Fuel: 30 min On-Duty every 1000 mi.
- Pickup/Dropoff: 1 hr On-Duty each + pre-trip 15 min On-Duty.
- Avg planning speed 55 mph.
"""

from datetime import datetime, timedelta, timezone

import polyline as polyline_lib

AVG_SPEED_MPH = 55.0
CHUNK_MILES = 55.0  # 1-hr driving chunks
PRETRIP_MIN = 15
PICKUP_DROPOFF_MIN = 60
BREAK_30_MIN = 30
REST_10HR_MIN = 600
FUEL_MIN = 30
FUEL_INTERVAL_MI = 1000.0


def _next_8am(now: datetime) -> datetime:
    start = now.replace(hour=8, minute=0, second=0, microsecond=0)
    if start <= now:
        start += timedelta(days=1)
    return start


def _decode_route_points(route_info: dict, origin, pickup, dropoff) -> list[tuple[float, float]]:
    try:
        pts = polyline_lib.decode(route_info.get("polyline", ""))
        if len(pts) >= 2:
            return pts
    except Exception:
        pass
    return [
        (origin["lat"], origin["lng"]),
        (pickup["lat"], pickup["lng"]),
        (dropoff["lat"], dropoff["lng"]),
    ]


def _point_at_fraction(points: list[tuple[float, float]], frac: float) -> tuple[float, float]:
    if not points:
        return (0.0, 0.0)
    frac = max(0.0, min(1.0, frac))
    idx = frac * (len(points) - 1)
    lo = int(idx)
    hi = min(lo + 1, len(points) - 1)
    t = idx - lo
    la = points[lo][0] + (points[hi][0] - points[lo][0]) * t
    ln = points[lo][1] + (points[hi][1] - points[lo][1]) * t
    return (la, ln)
 

def calculate_itinerary_and_logs(origin, pickup, dropoff, start_cycle_hrs, route_info, now=None):
    """Returns (stops, daily_logs, totals).

    stops: [{stop_sequence, stop_type, location_name, lat, lng, planned_arrival, duration_minutes}]
    daily_logs: [{log_date, total_miles_today, off/sleeper/driving/onduty_hrs, segments[]}]
    totals: {totalDistanceMiles, totalDrivingHours, totalOnDutyHours, totalRestHours,
             totalTripDurationHours, remainingCycleHours, cycleWarning, fuelStops, rest10Count}
    """
    now = now or datetime.now(timezone.utc)
    if now.tzinfo is None:
        # Repository stores tz-aware datetimes (USE_TZ=True); a naive `now`
        # (e.g. from tests) would poison every planned_arrival. Assume UTC.
        now = now.replace(tzinfo=timezone.utc)
    total_dist = float(route_info.get("distance_miles", 0) or 0)
    legs = route_info.get("legs") or []
    if len(legs) >= 2:
        leg1_miles = float(legs[0].get("distance_miles", total_dist * 0.4))
        leg2_miles = float(legs[1].get("distance_miles", total_dist - leg1_miles))
    else:
        leg1_miles = round(total_dist * 0.4, 2)
        leg2_miles = round(total_dist - leg1_miles, 2)

    points = _decode_route_points(route_info, origin, pickup, dropoff)

    t = _next_8am(now)
    shift_drive = 0.0
    shift_duty = 0.0
    since_break = 0.0  # driving hrs since last 30-min break
    miles_since_fuel = 0.0
    cycle = float(start_cycle_hrs)
    miles_driven = 0.0

    stops: list[dict] = []
    # timeline: contiguous events covering [trip_start, trip_end]
    # {start, end, status: OFF_DUTY|SLEEPER|DRIVING|ON_DUTY, location, miles}
    timeline: list[dict] = []
    seq = 1

    def coord_for_current_miles():
        frac = miles_driven / total_dist if total_dist > 0 else 0
        return _point_at_fraction(points, frac)

    def add_stop(stop_type, location_name, lat, lng, arrival, duration_min):
        nonlocal seq
        stops.append(
            {
                "stop_sequence": seq,
                "stop_type": stop_type,
                "location_name": location_name,
                "lat": lat,
                "lng": lng,
                "planned_arrival": arrival,
                "duration_minutes": duration_min,
            }
        )
        seq += 1

    def push_event(status, location, start, end, miles=0.0):
        if end > start:
            timeline.append(
                {"start": start, "end": end, "status": status, "location": location, "miles": miles}
            )

    # --- ORIGIN + pre-trip ---
    trip_start = t
    add_stop("ORIGIN", origin["name"], origin["lat"], origin["lng"], t, 0)
    pre_end = t + timedelta(minutes=PRETRIP_MIN)
    push_event("ON_DUTY", origin["name"], t, pre_end)
    lat0, lng0 = coord_for_current_miles()
    add_stop("PRETRIP", f"Pre-trip inspection — {origin['name']}", origin["lat"], origin["lng"], t, PRETRIP_MIN)
    # fix sequence: ORIGIN keeps seq 1, PRETRIP seq 2 — planned_arrival for PRETRIP is its start
    t = pre_end
    shift_duty += PRETRIP_MIN / 60.0
    cycle += PRETRIP_MIN / 60.0

    def drive_miles(miles_to_drive, leg_label):
        nonlocal t, shift_drive, shift_duty, since_break, miles_since_fuel, cycle, miles_driven
        remaining = miles_to_drive
        guard = 0
        while remaining > 1e-6:
            guard += 1
            if guard > 5000:
                raise RuntimeError("HOS simulation did not converge")
            chunk = min(CHUNK_MILES, remaining)
            chunk_hrs = chunk / AVG_SPEED_MPH
            # --- 11hr / 14hr checks BEFORE the chunk ---
            # NOTE: the 70-hr cycle is NOT reset by a 10-hr break (needs a
            # 34-hr restart), so exceeding it must not trigger infinite rests.
            # It is reported via totals.cycleWarning / remainingCycleHours.
            if (
                shift_drive + chunk_hrs > 11.0 + 1e-9
                or shift_duty + chunk_hrs > 14.0 + 1e-9
            ):
                lat, lng = coord_for_current_miles()
                loc = f"Rest Area / Truck Stop — {miles_driven:.0f} mi mark ({leg_label})"
                add_stop("REST_10HR", loc, lat, lng, t, REST_10HR_MIN)
                end = t + timedelta(minutes=REST_10HR_MIN)
                push_event("SLEEPER", loc, t, end)
                t = end
                shift_drive = 0.0
                shift_duty = 0.0
                since_break = 0.0
                # NOTE: 10-hr reset does NOT reset the 70-hr cycle (needs 34-hr restart).
                # cycle keeps accumulating — exceeding 70 sets the warning flag downstream.
                continue
            # --- 30-min break BEFORE chunk that would reach 8 hrs driving ---
            if since_break + chunk_hrs >= 8.0 - 1e-9:
                lat, lng = coord_for_current_miles()
                loc = f"Rest Stop (30-min break) — {miles_driven:.0f} mi mark"
                add_stop("REST_30MIN", loc, lat, lng, t, BREAK_30_MIN)
                end = t + timedelta(minutes=BREAK_30_MIN)
                push_event("OFF_DUTY", loc, t, end)
                t = end
                shift_duty += BREAK_30_MIN / 60.0
                cycle += BREAK_30_MIN / 60.0
                since_break = 0.0
            # --- drive the chunk ---
            start = t
            end = t + timedelta(hours=chunk_hrs)
            push_event("DRIVING", f"En route ({leg_label})", start, end, miles=chunk)
            t = end
            shift_drive += chunk_hrs
            shift_duty += chunk_hrs
            since_break += chunk_hrs
            cycle += chunk_hrs
            miles_driven += chunk
            miles_since_fuel += chunk
            remaining -= chunk
            # --- fuel AFTER each chunk when interval reached ---
            if miles_since_fuel >= FUEL_INTERVAL_MI - 1e-9:
                lat, lng = coord_for_current_miles()
                loc = f"Fuel Station — {miles_driven:.0f} mi mark"
                add_stop("FUEL", loc, lat, lng, t, FUEL_MIN)
                end = t + timedelta(minutes=FUEL_MIN)
                push_event("ON_DUTY", loc, t, end)
                t = end
                shift_duty += FUEL_MIN / 60.0
                cycle += FUEL_MIN / 60.0
                miles_since_fuel = 0.0

    # --- leg 1: origin -> pickup ---
    drive_miles(leg1_miles, f"{origin['name']} → {pickup['name']}")
    # pickup work
    add_stop("PICKUP", pickup["name"], pickup["lat"], pickup["lng"], t, PICKUP_DROPOFF_MIN)
    end = t + timedelta(minutes=PICKUP_DROPOFF_MIN)
    push_event("ON_DUTY", pickup["name"], t, end)
    t = end
    shift_duty += 1.0
    cycle += 1.0

    # --- leg 2: pickup -> dropoff ---
    drive_miles(leg2_miles, f"{pickup['name']} → {dropoff['name']}")
    # dropoff work
    add_stop("DROPOFF", dropoff["name"], dropoff["lat"], dropoff["lng"], t, PICKUP_DROPOFF_MIN)
    end = t + timedelta(minutes=PICKUP_DROPOFF_MIN)
    push_event("ON_DUTY", dropoff["name"], t, end)
    t = end
    shift_duty += 1.0
    cycle += 1.0

    trip_end = t

    # --- totals ---
    driving_hrs = sum((e["end"] - e["start"]).total_seconds() / 3600 for e in timeline if e["status"] == "DRIVING")
    on_not_driving = sum((e["end"] - e["start"]).total_seconds() / 3600 for e in timeline if e["status"] == "ON_DUTY")
    off_hrs = sum((e["end"] - e["start"]).total_seconds() / 3600 for e in timeline if e["status"] == "OFF_DUTY")
    sleeper_hrs = sum((e["end"] - e["start"]).total_seconds() / 3600 for e in timeline if e["status"] == "SLEEPER")
    on_duty_total = driving_hrs + on_not_driving
    rest_total = off_hrs + sleeper_hrs
    duration_total = on_duty_total + rest_total
    remaining_cycle = 70.0 - cycle
    cycle_warning = cycle > 70.0 + 1e-9

    totals = {
        "totalDistanceMiles": round(total_dist, 1),
        "totalDrivingHours": round(driving_hrs, 2),
        "totalOnDutyHours": round(on_duty_total, 2),
        "totalRestHours": round(rest_total, 2),
        "totalTripDurationHours": round(duration_total, 2),
        "remainingCycleHours": round(remaining_cycle, 1),
        "cycleWarning": cycle_warning,
        "cycleHoursUsed": round(cycle, 2),
        "fuelStops": sum(1 for s in stops if s["stop_type"] == "FUEL"),
        "rest10Count": sum(1 for s in stops if s["stop_type"] == "REST_10HR"),
        "break30Count": sum(1 for s in stops if s["stop_type"] == "REST_30MIN"),
        "tripStart": trip_start,
        "tripEnd": trip_end,
    }

    daily_logs = _slice_into_daily_logs(timeline, trip_start, trip_end)

    return stops, daily_logs, totals


def _slice_into_daily_logs(timeline, trip_start, trip_end):
    """Slice contiguous timeline into per-calendar-day logs.

    Each day covers 00:00-24:00 (minutes 0-1440). Gaps before trip_start and
    after trip_end on touched days are filled OFF_DUTY. Totals sum to 24.0.
    Events crossing midnight are split proportionally (miles split by time).
    """
    if not timeline:
        return []
    days: list[dict] = []
    cur_day = trip_start.replace(hour=0, minute=0, second=0, microsecond=0)
    last_day = trip_end.replace(hour=0, minute=0, second=0, microsecond=0)
    while cur_day <= last_day:
        day_start = cur_day
        day_end = cur_day + timedelta(days=1)
        raw: list[dict] = []
        for e in timeline:
            s = max(e["start"], day_start)
            ee = min(e["end"], day_end)
            if ee > s:
                dur_h = (ee - s).total_seconds() / 3600.0
                full_h = (e["end"] - e["start"]).total_seconds() / 3600.0
                miles = e["miles"] * (dur_h / full_h) if full_h > 0 else 0.0
                raw.append({"start": s, "end": ee, "status": e["status"], "location": e["location"], "miles": miles})
        # fill leading/trailing gaps with OFF_DUTY
        raw.sort(key=lambda r: r["start"])
        filled: list[dict] = []
        cursor = day_start
        for r in raw:
            if r["start"] > cursor:
                filled.append({"start": cursor, "end": r["start"], "status": "OFF_DUTY", "location": "Off Duty", "miles": 0.0})
            filled.append(r)
            cursor = r["end"]
        if cursor < day_end:
            filled.append({"start": cursor, "end": day_end, "status": "OFF_DUTY", "location": "Off Duty", "miles": 0.0})
        # segments in minutes 0-1440
        segments = []
        for f in filled:
            s_min = int(round((f["start"] - day_start).total_seconds() / 60))
            e_min = int(round((f["end"] - day_start).total_seconds() / 60))
            s_min = max(0, min(1440, s_min))
            e_min = max(0, min(1440, e_min))
            if e_min <= s_min:
                continue
            segments.append(
                {
                    "status": f["status"],
                    "start_time_minutes": s_min,
                    "end_time_minutes": e_min,
                    "duration_minutes": e_min - s_min,
                    "remark_location": f["location"][:255],
                }
            )
        # merge consecutive same-status + same-location to keep grid readable
        merged: list[dict] = []
        for seg in segments:
            if (
                merged
                and merged[-1]["status"] == seg["status"]
                and merged[-1]["remark_location"] == seg["remark_location"]
                and merged[-1]["end_time_minutes"] == seg["start_time_minutes"]
            ):
                merged[-1]["end_time_minutes"] = seg["end_time_minutes"]
                merged[-1]["duration_minutes"] += seg["duration_minutes"]
            else:
                merged.append(dict(seg))
        # Snap boundaries so every day sums to EXACTLY 24.0h.
        # Minute-rounding above can leave 1-min gaps/overlaps (e.g. 23.99h days);
        # chaining each segment start to the previous end + pinning [0, 1440]
        # removes the drift without changing durations by more than a minute.
        if merged:
            merged[0]["start_time_minutes"] = 0
            for prev, cur in zip(merged, merged[1:]):
                cur["start_time_minutes"] = prev["end_time_minutes"]
            merged[-1]["end_time_minutes"] = 1440
            for seg in merged:
                seg["duration_minutes"] = seg["end_time_minutes"] - seg["start_time_minutes"]
            merged = [s for s in merged if s["duration_minutes"] > 0]
        # day totals from merged segments
        def hrs(status):
            return round(sum(s["duration_minutes"] for s in merged if s["status"] == status) / 60.0, 2)

        day_miles = round(sum(r.get("miles", 0.0) for r in raw if r["status"] == "DRIVING"), 1)
        days.append(
            {
                "log_date": day_start.date(),
                "total_miles_today": day_miles,
                "off_duty_hours": hrs("OFF_DUTY"),
                "sleeper_berth_hours": hrs("SLEEPER"),
                "driving_hours": hrs("DRIVING"),
                "on_duty_not_driving_hours": hrs("ON_DUTY"),
                "segments": merged,
            }
        )
        cur_day += timedelta(days=1)
    return days
