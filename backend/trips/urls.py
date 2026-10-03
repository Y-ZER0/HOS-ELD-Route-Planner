from django.urls import path

from trips.views import (
    HealthView,
    LocationsAutocompleteView,
    PlanTripView,
    TripDetailView,
    TripListView,
)

urlpatterns = [
    path("trips/plan/", PlanTripView.as_view(), name="plan-trip"),
    path("trips/plan", PlanTripView.as_view(), name="plan-trip-noslash"),
    path("trips/<uuid:trip_id>/", TripDetailView.as_view(), name="trip-detail"),
    path("trips/", TripListView.as_view(), name="trip-list"),
    path("locations/autocomplete/", LocationsAutocompleteView.as_view(), name="locations-autocomplete"),
    path("locations/autocomplete", LocationsAutocompleteView.as_view(), name="locations-autocomplete-noslash"),
    path("health/", HealthView.as_view(), name="health"),
]
