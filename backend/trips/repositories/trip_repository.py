from django.db import transaction

from trips.models import DailyEldLog, Driver, LogDutySegment, Trip, TripStop

 
class TripRepository:
    @staticmethod
    def get_or_create_default_driver() -> Driver:
        driver, _ = Driver.objects.get_or_create(
            name="A. Carter",
            defaults={
                "carrier_name": "Spotter Logistics LLC",
                "home_terminal": "4400 Logistics Pkwy, Dallas, TX",
                "home_terminal_address": "4400 Logistics Pkwy, Dallas, TX",
                "main_office": "1200 Fleet Ave, Chicago, IL",
                "main_office_address": "1200 Fleet Ave, Chicago, IL",
                "tractor_number": "TRK-1148",
                "trailer_number": "TRL-88240",
                "bol_number": "55219-A",
                "cdl_number": "TX-4483921",
            },
        )
        return driver

    @staticmethod
    def create_complete_trip(driver, origin, pickup, dropoff, start_cycle_hrs, route_info, stops, logs, totals) -> Trip:
        with transaction.atomic():
            trip = Trip.objects.create(
                driver=driver,
                origin_name=origin["name"],
                origin_lat=origin["lat"],
                origin_lng=origin["lng"],
                pickup_name=pickup["name"],
                pickup_lat=pickup["lat"],
                pickup_lng=pickup["lng"],
                dropoff_name=dropoff["name"],
                dropoff_lat=dropoff["lat"],
                dropoff_lng=dropoff["lng"],
                start_cycle_hours=start_cycle_hrs,
                total_distance_miles=totals["totalDistanceMiles"],
                total_driving_hours=totals["totalDrivingHours"],
                total_onduty_hours=totals["totalOnDutyHours"],
                total_rest_hours=totals["totalRestHours"],
                total_duration_hours=totals["totalTripDurationHours"],
                remaining_cycle_hours=totals["remainingCycleHours"],
                cycle_warning=totals.get("cycleWarning", False),
                encoded_polyline=route_info.get("polyline", ""),
            )
            TripStop.objects.bulk_create(
                [
                    TripStop(
                        trip=trip,
                        stop_sequence=s["stop_sequence"],
                        stop_type=s["stop_type"],
                        location_name=s["location_name"],
                        latitude=s["lat"],
                        longitude=s["lng"],
                        planned_arrival=s["planned_arrival"],
                        duration_minutes=s["duration_minutes"],
                    )
                    for s in stops
                ]
            )
            for log in logs:
                daily = DailyEldLog.objects.create(
                    trip=trip,
                    driver=driver,
                    log_date=log["log_date"],
                    total_miles_today=log["total_miles_today"],
                    off_duty_hours=log["off_duty_hours"],
                    sleeper_berth_hours=log["sleeper_berth_hours"],
                    driving_hours=log["driving_hours"],
                    on_duty_not_driving_hours=log["on_duty_not_driving_hours"],
                )
                LogDutySegment.objects.bulk_create(
                    [
                        LogDutySegment(
                            daily_log=daily,
                            status=seg["status"],
                            start_time_minutes=seg["start_time_minutes"],
                            end_time_minutes=seg["end_time_minutes"],
                            duration_minutes=seg["duration_minutes"],
                            remark_location=seg.get("remark_location", ""),
                        )
                        for seg in log["segments"]
                    ]
                )
            return trip
