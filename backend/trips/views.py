from django.core.exceptions import ValidationError
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from trips.models import Trip
from trips.repositories.trip_repository import TripRepository
from trips.serializers import to_contract_response
from trips.services import geocode_service, trip_planner_service


class PlanTripView(APIView):
    """POST /api/v1/trips/plan/ — plan + persist a trip.

    Accepts (case-insensitive variants for compat):
      {currentLocation, pickupLocation, dropOffLocation, currentCycleHoursUsed}
    where locations are free-text ("Chicago, IL") or {name, lat, lng}.
    """
 
    authentication_classes = []
    permission_classes = []

    def post(self, request):
        try:
            planned = trip_planner_service.plan_trip(request.data or {})
        except geocode_service.GeocodeError as exc:
            return Response(
                {"error": str(exc)},
                status=422,
            )
        except (ValueError, AttributeError, TypeError) as exc:
            # AttributeError/TypeError: request.data was a JSON list/str, not an object.
            msg = str(exc) or (
                "Request body must be a JSON object with currentLocation, "
                "pickupLocation, dropOffLocation, currentCycleHoursUsed."
            )
            return Response({"error": msg}, status=status.HTTP_400_BAD_REQUEST)

        driver = TripRepository.get_or_create_default_driver()
        trip = TripRepository.create_complete_trip(
            driver,
            planned["origin"],
            planned["pickup"],
            planned["dropoff"],
            planned["start_cycle_hours"],
            planned["route_info"],
            planned["stops"],
            planned["logs"],
            planned["totals"],
        )
        # re-fetch with prefetches for clean serialization
        trip = (
            Trip.objects.select_related("driver")
            .prefetch_related("stops", "daily_logs__segments")
            .get(pk=trip.pk)
        )
        data = to_contract_response(
            trip, route_fallback=planned["route_info"].get("fallback", False)
        )
        return Response({"data": data}, status=status.HTTP_201_CREATED)


class TripDetailView(APIView):
    """GET /api/v1/trips/<id>/ — reload/share a planned trip."""

    authentication_classes = []
    permission_classes = []

    def get(self, request, trip_id):
        try:
            trip = (
                Trip.objects.select_related("driver")
                .prefetch_related("stops", "daily_logs__segments")
                .get(pk=trip_id)
            )
        except (Trip.DoesNotExist, ValueError, ValidationError, AttributeError):
            # ValidationError: malformed UUID string (e.g. "not-a-uuid") — 404, never 500.
            return Response({"error": "Trip not found"}, status=status.HTTP_404_NOT_FOUND)
        return Response({"data": to_contract_response(trip)})


class TripListView(APIView):
    """GET /api/v1/trips/ — recent trips (for share/reload)."""

    authentication_classes = []
    permission_classes = []

    def get(self, request):
        trips = (
            Trip.objects.select_related("driver")
            .prefetch_related("stops", "daily_logs__segments")
            .order_by("-created_at")[:20]
        )
        return Response(
            {"data": [to_contract_response(t) for t in trips]},
        )


class HealthView(APIView):
    authentication_classes = []
    permission_classes = []

    def get(self, request):
        return Response({"status": "ok"})


class LocationsAutocompleteView(APIView):
    """GET /api/v1/locations/autocomplete/?q=Chic&limit=5 — UI typeahead helper.

    Pure search-as-you-type proxy over Nominatim. Never 500s: transport
    errors and empty results both yield 200 with {"data": []}.
    """

    authentication_classes = []
    permission_classes = []

    def get(self, request):
        q = request.query_params.get("q", "")
        if q is None:
            q = ""
        q = str(q).strip()
        if not q:
            return Response(
                {"error": "Missing 'q' query param."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if len(q) < geocode_service.AUTOCOMPLETE_MIN_CHARS:
            return Response({"data": []})

        limit_raw = request.query_params.get("limit", 5)
        try:
            limit = int(limit_raw)
        except (TypeError, ValueError):
            limit = 5
        limit = max(1, min(10, limit))

        try:
            results = geocode_service.autocomplete(q, limit)
        except Exception:  # defensive: autocomplete itself never raises, but be safe
            results = []
        return Response({"data": results})
