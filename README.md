# Spotter — HOS & ELD Compliance Route Planner

A full-stack logistics web application built with **Django (N-Layer Architecture)** and **React (TypeScript + Tailwind CSS v4)**. It automates long-haul trip planning while enforcing federal **FMCSA Hours of Service (HOS)** regulations and generates 24-hour **Electronic Logging Device (ELD)** daily log sheets.

| | |
|---|---|
| **Live App** | `https://spotter-hos-planner.netlify.app/` |

---

## Table of Contents

- [Key Features](#-key-features)
- [System Architecture](#-system-architecture)
- [REST API Reference](#-rest-api-reference)
- [Local Development Setup](#-local-development-setup)
- Database Configuration (Supabase)
- [Deployment](#-deployment)
- [Assessment Checklist](#-assessment-checklist)

---

## Key Features

- **Intelligent Route Planning** — Calculates distance, driving duration, and route polylines connecting the origin, pickup, and drop-off locations.
- **Automated FMCSA Safety Engine**
  - **70-Hour / 8-Day Cycle Rule** — Tracks accumulated cycle hours and warns when limits are exceeded.
  - **11-Hour Driving & 14-Hour Duty Limits** — Mandates a 10-consecutive-hour reset (Sleeper Berth / Off Duty) when limits are reached.
  - **30-Minute Rest Break** — Enforced after 8 cumulative hours of driving.
  - **1,000-Mile Fueling Interval** — Schedules a 30-minute fuel stop every 1,000 miles.
  - **1-Hour Terminal Operations** — Allocates exactly 1 hour of On-Duty time for each pickup and drop-off.
- **Interactive Map & Itinerary** — Leaflet map with decoded polyline routing, stop markers, and a chronological step-by-step itinerary.
- **Multi-Day 24-Hour ELD Log Sheets** — Custom SVG step-line grids across the four duty statuses (Off Duty, Sleeper, Driving, On Duty), with per-status hour totals, location remarks, and compliance badges.
- **Resilient Fallbacks** — Geocoding and routing fall back to Haversine math and static datasets if external services fail, so the API degrades gracefully instead of returning `500` errors.
- **Print-Ready Styling** — CSS print stylesheets for clean physical export of driver log sheets.

---

## 🏗 System Architecture

The application is a decoupled full-stack system with a clean separation of concerns.

```text
              ┌─────────────────────────────────────────┐
              │              React Frontend             │
              │   (Vite + TypeScript + Tailwind v4)     │
              └────────────────────┬────────────────────┘
                                   │
                                   │ HTTP REST API (JSON)
                                   ▼
              ┌─────────────────────────────────────────┐
              │            Django REST Backend          │
              │        (N-Layer Architecture)           │
              └────────────────────┬────────────────────┘
                                   │
     ┌─────────────────────────────┼─────────────────────────────┐
     ▼                             ▼                             ▼
┌──────────────────┐        ┌──────────────────┐        ┌──────────────────┐
│ Controller Layer │        │  Service Layer   │        │ Repository Layer │
│  (DRF APIViews)  │ ─────► │ (HOS Engine &    │ ─────► │   (Django ORM /  │
│                  │        │  Route Services) │        │     Supabase)    │
└──────────────────┘        └──────────────────┘        └──────────────────┘
```

### Backend (Django N-Layer)

| Layer | File(s) | Responsibility |
|---|---|---|
| **Controller** | `views.py`, `serializers.py` | HTTP request parsing, payload normalization, input validation, response serialization |
| **Orchestrator** | `trip_planner_service.py` | Coordinates geocoding, route retrieval, and HOS calculations |
| **Geocoding** | `geocode_service.py` | Resolves city names to coordinates via OpenStreetMap Nominatim, with in-memory caching and fallback datasets |
| **Routing** | `route_service.py` | Queries the Open Source Routing Machine (OSRM) for road distance and polylines, with Haversine fallback |
| **HOS Engine** | `hos_engine.py` | Pure Python domain logic: applies FMCSA rules and slices the trip timeline into 24-hour daily log grids |
| **Repository** | `trip_repository.py` | Encapsulates ORM queries; atomic bulk inserts via `transaction.atomic()` |
| **Database** | `Supabase PostgreSQL` | Cloud PostgreSQL instance managed via `dj-database-url` and `psycopg2-binary`|


### Frontend (React)

| Concern | Technology |
|---|---|
| Forms & validation | React Hook Form + Zod |
| Data fetching | TanStack Query (`useMutation`) + Axios |
| State management | Zustand with `localStorage` persistence across reloads |
| UI | Tailwind CSS v4 (semantic OKLCH colors), Lucide icons, Leaflet maps, custom SVG drawings |

---

### Database Schema
<img width="1854" height="614" alt="HOS_ELD" src="https://github.com/user-attachments/assets/f69069f1-1ed1-4d6d-9978-b6e423a6de5a" />

## REST API Reference

### `POST /api/v1/trips/plan/`

Calculates a trip itinerary and generates daily ELD log sheets.

**Request body**

```json
{
  "currentLocation": "Chicago, IL",
  "pickupLocation": "Atlanta, GA",
  "dropOffLocation": "Dallas, TX",
  "currentCycleHoursUsed": 15.0
}
```

**Response — `201 Created`**

```json
{
  "data": {
    "driver": {
      "name": "A. Carter",
      "carrierName": "Spotter Logistics LLC",
      "mainOfficeAddress": "Chicago, IL",
      "tractorNumber": "TRK-1148",
      "trailerNumber": "TRL-88240"
    },
    "trip": {
      "id": "e8f81a24-11b2-4d2a-9e12-320984210081",
      "originName": "Chicago, IL",
      "pickupName": "Atlanta, GA",
      "dropoffName": "Dallas, TX",
      "startCycleHours": 15.0,
      "totalDistanceMiles": 1420.5,
      "totalDurationHours": 31.5,
      "encodedPolyline": "...",
      "stops": [ "..." ],
      "dailyLogs": [ "..." ]
    }
  }
}
```

### Secondary endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/v1/trips/<uuid>/` | Retrieve a saved trip by ID |
| `GET` | `/api/v1/trips/` | Fetch recent trip history |
| `GET` | `/api/v1/health/` | Health check |

---

## 🛠 Local Development Setup

### Prerequisites

- Python **3.11+**
- Node.js **18.0+**
- npm **9.0+**

### 1. Backend (Django)

```bash
# Navigate to the backend directory
cd backend

# Create and activate a virtual environment
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Apply migrations
python manage.py migrate

# Start the development server
python manage.py runserver 0.0.0.0:8000
```

Backend runs at: <http://127.0.0.1:8000/api/v1/>

### 2. Frontend (React)

```bash
# Navigate to the frontend directory
cd frontend

# Install dependencies
npm install

# (Optional) Point the frontend at your API — defaults to localhost
echo "VITE_API_BASE_URL=http://127.0.0.1:8000/api/v1" > .env.local

# Start the Vite development server
npm run dev
```

Frontend runs at: <http://localhost:5173>

---

## Deployment

### Backend — Render

### Frontend — Netlify  

### Datbase - Supabase / Postgre


