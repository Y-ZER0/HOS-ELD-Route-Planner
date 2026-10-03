from rest_framework import serializers

from trips.models import DailyEldLog, Driver, LogDutySegment, Trip, TripStop


class LogDutySegmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = LogDutySegment
        fields = [
            "id",
            "status",
            "start_time_minutes",
            "end_time_minutes",
            "duration_minutes",
            "remark_location",
        ]


class DailyEldLogSerializer(serializers.ModelSerializer):
    segments = LogDutySegmentSerializer(many=True, read_only=True)

    class Meta:
        model = DailyEldLog
        fields = [
            "id",
            "log_date",
            "total_miles_today",
            "off_duty_hours",
            "sleeper_berth_hours",
            "driving_hours",
            "on_duty_not_driving_hours",
            "segments",
        ]


class TripStopSerializer(serializers.ModelSerializer):
    class Meta:
        model = TripStop
        fields = [
            "id",
            "stop_sequence",
            "stop_type",
            "location_name",
            "latitude",
            "longitude",
            "planned_arrival",
            "duration_minutes",
        ]


class DriverSerializer(serializers.ModelSerializer):
    carrierName = serializers.CharField(source="carrier_name")
    homeTerminal = serializers.CharField(source="home_terminal")
    mainOffice = serializers.CharField(source="main_office")
    tractorNumber = serializers.CharField(source="tractor_number")
    trailerNumber = serializers.CharField(source="trailer_number")
    bolNumber = serializers.CharField(source="bol_number")
    cdlNumber = serializers.CharField(source="cdl_number")

    class Meta:
        model = Driver
        fields = [
            "id",
            "name",
            "carrierName",
            "homeTerminal",
            "mainOffice",
            "tractorNumber",
            "trailerNumber",
            "bolNumber",
            "cdlNumber",
        ]


class TripSerializer(serializers.ModelSerializer):
    stops = TripStopSerializer(many=True, read_only=True)
    daily_logs = DailyEldLogSerializer(many=True, read_only=True)
    driver = DriverSerializer(read_only=True)

    class Meta:
        model = Trip
        fields = [
            "id",
            "driver",
            "origin_name",
            "pickup_name",
            "dropoff_name",
            "origin_lat",
            "origin_lng",
            "pickup_lat",
            "pickup_lng",
            "dropoff_lat",
            "dropoff_lng",
            "start_cycle_hours",
            "total_distance_miles",
            "total_driving_hours",
            "total_onduty_hours",
            "total_rest_hours",
            "total_duration_hours",
            "remaining_cycle_hours",
            "cycle_warning",
            "encoded_polyline",
            "stops",
            "daily_logs",
            "created_at",
        ]


def to_contract_response(trip: Trip, route_fallback: bool = False) -> dict:
    """Shape the response to match logic.txt / BUILD_PLAN_IMPROVED §7 contract."""
    driver = trip.driver
    logs = []
    for log in trip.daily_logs.all().order_by("log_date"):
        logs.append(
            {
                "date": log.log_date.isoformat(),
                "totalMilesDriven": log.total_miles_today,
                "offDutyHours": log.off_duty_hours,
                "sleeperBerthHours": log.sleeper_berth_hours,
                "drivingHours": log.driving_hours,
                "onDutyHours": log.on_duty_not_driving_hours,
                "remarks": [
                    {
                        "status": s.status,
                        "startMinutes": s.start_time_minutes,
                        "endMinutes": s.end_time_minutes,
                        "durationMinutes": s.duration_minutes,
                        "location": s.remark_location,
                    }
                    for s in log.segments.all().order_by("start_time_minutes")
                ],
                "segments": [
                    {
                        "status": s.status,
                        "start_time_minutes": s.start_time_minutes,
                        "end_time_minutes": s.end_time_minutes,
                        "duration_minutes": s.duration_minutes,
                        "remark_location": s.remark_location,
                    }
                    for s in log.segments.all().order_by("start_time_minutes")
                ],
            }
        )
    stops = [
        {
            "stopSequence": s.stop_sequence,
            "stopType": s.stop_type.lower(),
            "stop_type": s.stop_type,
            "locationName": s.location_name,
            "location_name": s.location_name,
            "latitude": s.latitude,
            "longitude": s.longitude,
            "arrivalTime": s.planned_arrival.isoformat(),
            "planned_arrival": s.planned_arrival.isoformat(),
            "durationMinutes": s.duration_minutes,
        }
        for s in trip.stops.all().order_by("stop_sequence")
    ]
    return {
        "driver": {
            "name": driver.name,
            "carrierName": driver.carrier_name,
            "homeTerminal": driver.home_terminal,
            "mainOffice": driver.main_office,
            "tractorNumber": f"{driver.tractor_number} / {driver.trailer_number}",
            "tractor_number": driver.tractor_number,
            "trailer_number": driver.trailer_number,
            "bolNumber": driver.bol_number,
            "cdlNumber": driver.cdl_number,
        },
        "trip": {
            "id": str(trip.id),
            "currentLocation": trip.origin_name,
            "pickupLocation": trip.pickup_name,
            "dropOffLocation": trip.dropoff_name,
            "startCycleHrsUsed": trip.start_cycle_hours,
            "totalDistanceMiles": trip.total_distance_miles,
            "totalDrivingHours": trip.total_driving_hours,
            "totalOnDutyHours": trip.total_onduty_hours,
            "totaRestHours": trip.total_rest_hours,
            "totalRestHours": trip.total_rest_hours,
            "totalTripDurationHours": trip.total_duration_hours,
            "RemainingCycleHours": trip.remaining_cycle_hours,
            "remainingCycleHours": trip.remaining_cycle_hours,
            "cycleWarning": trip.cycle_warning,
            "encodedPolyline": trip.encoded_polyline,
            "routeFallback": route_fallback,
            "logs": logs,
            "stops": stops,
        },
        "createdAt": trip.created_at.isoformat() if trip.created_at else None,
    }
