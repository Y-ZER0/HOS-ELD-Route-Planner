from django.urls import path

from trips.views import HealthView, PlanTripView, TripDetailView, TripListView

urlpatterns = [
    path("trips/plan/", PlanTripView.as_view(), name="plan-trip"),
    path("trips/plan", PlanTripView.as_view(), name="plan-trip-noslash"),
    path("trips/<uuid:trip_id>/", TripDetailView.as_view(), name="trip-detail"),
    path("trips/", TripListView.as_view(), name="trip-list"),
    path("health/", HealthView.as_view(), name="health"),
]
