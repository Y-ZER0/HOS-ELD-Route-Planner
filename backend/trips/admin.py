from django.contrib import admin

from trips.models import DailyEldLog, Driver, LogDutySegment, Trip, TripStop


@admin.register(Driver)
class DriverAdmin(admin.ModelAdmin):
    list_display = ("name", "carrier_name", "tractor_number", "trailer_number")


class TripStopInline(admin.TabularInline):
    model = TripStop
    extra = 0


class DailyEldLogInline(admin.TabularInline):
    model = DailyEldLog
    extra = 0


@admin.register(Trip)
class TripAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "origin_name",
        "pickup_name",
        "dropoff_name",
        "total_distance_miles",
        "created_at",
    )
    inlines = [TripStopInline, DailyEldLogInline]


@admin.register(TripStop)
class TripStopAdmin(admin.ModelAdmin):
    list_display = ("trip", "stop_sequence", "stop_type", "location_name")


@admin.register(DailyEldLog)
class DailyEldLogAdmin(admin.ModelAdmin):
    list_display = ("trip", "log_date", "total_miles_today")


@admin.register(LogDutySegment)
class LogDutySegmentAdmin(admin.ModelAdmin):
    list_display = ("daily_log", "status", "start_time_minutes", "end_time_minutes")
