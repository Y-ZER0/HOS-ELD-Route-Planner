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
