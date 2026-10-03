# Spotter HOS Frontend

Vite + React-TS + Tailwind v4 + Leaflet. Dark navy theme matching the UI mock.

## Run

```bash
cp .env.example .env   # VITE_API_BASE_URL=http://127.0.0.1:8000/api/v1
npm install
npm run dev            # :5173
npm run build          # dist/
```

Backend must be running (`backend/`, Django `:8000`).

## What was built (§6 of BUILD_PLAN_IMPROVED.md)

- **Shell + theme + store + form** — `App.tsx` 3-column layout, `index.css` OKLCH
  tokens (light + `.dark` default), `useAppStore.ts` (theme + activeTrip +
  localStorage), `tripSchema.ts` (zod string locations + 0–70 slider).
- **Map + itinerary + stats** — `RouteMap.tsx` (react-leaflet, CARTO dark tiles,
  `polyline` decode in `useMemo`, `FitBounds`, per-type markers + legend),
  `ItineraryList.tsx` (icons per stop_type, arrival + duration),
  `StatCards.tsx` (distance, duration, 10hr/fuel counts, cycle left).
- **ELD grid + remarks + export** — `EldGraphGrid.tsx` (SVG step path, sleeper
  row + shading), `EldSheet.tsx` (Day tabs, FMCSA header, totals + compliance
  badge, remarks table), header Print button + `@media print` CSS
  (`.no-print` hidden, ELD pages kept).

API: `POST /api/v1/trips/plan/` via `usePlanTrip()` (React Query), response
shaped by `to_contract_response`. Before the first plan, `MOCK_TRIP` mirrors
the mock (Chicago → Atlanta → Dallas, 1544 mi).
