# Spotter HOS & ELD Route Planner — Backend

Django + DRF, N-layer (`views -> services -> repositories -> PG`).
Implements `BUILD_PLAN_IMPROVED.md` §5 (Backend Build).

## Quickstart

```bash
uv venv venv --python 3.12
uv pip install --python venv/bin/python -r requirements.txt
# or: venv/bin/pip install -r requirements.txt
venv/bin/python manage.py migrate
venv/bin/python manage.py runserver
```

Run tests:

```bash
venv/bin/python -m pytest -v
```

## API

- `POST /api/v1/trips/plan/` — plan + persist a trip
- `GET /api/v1/trips/<uuid>/` — reload/share
- `GET /api/v1/trips/` — recent trips
- `GET /api/v1/health/` — health check

Request (strings preferred; `{name,lat,lng}` objects also accepted; both
`currentCycleHoursUsed` and `startCycleHrsUsed` key variants accepted):

```json
{
  "currentLocation": "Chicago, IL",
  "pickupLocation": "Atlanta, GA",
  "dropOffLocation": "Dallas, TX",
  "currentCycleHoursUsed": 14
}
```

Response `201`: `{ "data": { "driver": {...}, "trip": {...} } }` per
`BUILD_PLAN_IMPROVED.md` §7 / `logic.txt`. Errors: `400` bad cycle/input,
`422` unknown city. Full matrix: `EDGE_CASES.md` (25 cases, all tested —
no input or outage returns 500).

## Database: SQLite (dev) / Supabase Postgres (prod)

Same code, same migrations — set `DATABASE_URL` to switch. Full walkthrough
(incl. direct vs pooler URLs and driver seeding): `SUPABASE_SETUP.md`.

```bash
python manage.py migrate --noinput   # tables + seeds A. Carter (0002)
python manage.py seed_driver         # idempotent verify / re-seed
```

## Services

- `services/geocode_service.py` — Nominatim + in-memory cache + hardcoded fallback.
- `services/route_service.py` — OSRM `https`, two legs separately, haversine fallback. Never 500s.
- `services/hos_engine.py` — 1-hr chunk simulation (11/14/8hr/1000mi rules), calendar-day ELD slicing (each day sums to 24.0h).
- `services/trip_planner_service.py` — orchestrates geocode → route → HOS.
- `repositories/trip_repository.py` — atomic `create_complete_trip()` with `bulk_create`.

## Deploy (Render)

Build: `pip install -r requirements.txt && python manage.py migrate --noinput`
Start: `gunicorn core.wsgi`
Env: `SECRET_KEY, DEBUG=0, DATABASE_URL, ALLOWED_HOSTS, CORS_ALLOWED_ORIGINS`
