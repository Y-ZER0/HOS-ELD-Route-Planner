import uuid

from django.db import models


class Driver(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=150, default="A. Carter")
    carrier_name = models.CharField(max_length=200, default="Spotter Logistics LLC")
    home_terminal = models.CharField(
        max_length=255, default="4400 Logistics Pkwy, Dallas, TX"
    )
    main_office = models.CharField(
        max_length=255, default="1200 Fleet Ave, Chicago, IL"
    )
    # Kept for backwards-compat with project.md naming
    home_terminal_address = models.CharField(
        max_length=255, default="4400 Logistics Pkwy, Dallas, TX"
    )
    main_office_address = models.CharField(
        max_length=255, default="1200 Fleet Ave, Chicago, IL"
    )
    tractor_number = models.CharField(max_length=50, default="TRK-1148")
    trailer_number = models.CharField(max_length=50, default="TRL-88240")
    bol_number = models.CharField(max_length=50, default="55219-A")
    cdl_number = models.CharField(max_length=50, default="TX-4483921")
    created_at = models.DateTimeField(auto_now_add=True)

    def save(self, *args, **kwargs):
        # Keep alias fields in sync
        if not self.home_terminal_address:
            self.home_terminal_address = self.home_terminal
        if not self.home_terminal:
            self.home_terminal = self.home_terminal_address
        if not self.main_office_address:
            self.main_office_address = self.main_office
        if not self.main_office:
            self.main_office = self.main_office_address
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.name} ({self.carrier_name})"


class Trip(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    driver = models.ForeignKey(Driver, on_delete=models.CASCADE, related_name="trips")
    origin_name = models.CharField(max_length=255)
    origin_lat = models.FloatField()
    origin_lng = models.FloatField()
    pickup_name = models.CharField(max_length=255)
    pickup_lat = models.FloatField()
    pickup_lng = models.FloatField()
    dropoff_name = models.CharField(max_length=255)
    dropoff_lat = models.FloatField()
    dropoff_lng = models.FloatField()
    start_cycle_hours = models.FloatField(default=0.0)
    total_distance_miles = models.FloatField(default=0.0)
    total_driving_hours = models.FloatField(default=0.0)
    total_onduty_hours = models.FloatField(default=0.0)  # driving + on-duty-not-driving
    total_rest_hours = models.FloatField(default=0.0)  # off-duty + sleeper
    total_duration_hours = models.FloatField(default=0.0)  # onduty + rest
    remaining_cycle_hours = models.FloatField(default=0.0)
    cycle_warning = models.BooleanField(default=False)
    encoded_polyline = models.TextField(default="", blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.origin_name} -> {self.pickup_name} -> {self.dropoff_name}"


class TripStop(models.Model):
    STOP_TYPES = [
        ("ORIGIN", "Origin"),
        ("PICKUP", "Pickup (1hr On-Duty)"),
        ("DROPOFF", "Drop-off (1hr On-Duty)"),
        ("FUEL", "Fueling Stop (30min On-Duty)"),
        ("REST_30MIN", "30-Minute Rest Break"),
        ("REST_10HR", "10-Hour Mandatory Shift Reset"),
        ("PRETRIP", "Pre-trip Inspection (15min On-Duty)"),
    ]
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    trip = models.ForeignKey(Trip, on_delete=models.CASCADE, related_name="stops")
    stop_sequence = models.IntegerField()
    stop_type = models.CharField(max_length=20, choices=STOP_TYPES)
    location_name = models.CharField(max_length=255)
    latitude = models.FloatField()
    longitude = models.FloatField()
    planned_arrival = models.DateTimeField()
    duration_minutes = models.IntegerField()

    class Meta:
        ordering = ["stop_sequence"]

    def __str__(self):
        return f"#{self.stop_sequence} {self.stop_type} @ {self.location_name}"


class DailyEldLog(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    trip = models.ForeignKey(Trip, on_delete=models.CASCADE, related_name="daily_logs")
    driver = models.ForeignKey(
        Driver, on_delete=models.CASCADE, related_name="daily_logs"
    )
    log_date = models.DateField()
    total_miles_today = models.FloatField(default=0.0)
    off_duty_hours = models.FloatField(default=0.0)
    sleeper_berth_hours = models.FloatField(default=0.0)
    driving_hours = models.FloatField(default=0.0)
    on_duty_not_driving_hours = models.FloatField(default=0.0)

    class Meta:
        ordering = ["log_date"]
        unique_together = [("trip", "log_date")]

    def __str__(self):
        return f"{self.log_date} — {self.total_miles_today:.0f} mi"


class LogDutySegment(models.Model):
    DUTY_STATUSES = [
        ("OFF_DUTY", "Off Duty"),
        ("SLEEPER", "Sleeper Berth"),
        ("DRIVING", "Driving"),
        ("ON_DUTY", "On Duty (Not Driving)"),
    ]
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    daily_log = models.ForeignKey(
        DailyEldLog, on_delete=models.CASCADE, related_name="segments"
    )
    status = models.CharField(max_length=20, choices=DUTY_STATUSES)
    start_time_minutes = models.IntegerField()  # 0..1440
    end_time_minutes = models.IntegerField()  # 0..1440
    duration_minutes = models.IntegerField()
    remark_location = models.CharField(max_length=255, default="", blank=True)

    class Meta:
        ordering = ["start_time_minutes"]

    def __str__(self):
        return f"{self.status} {self.start_time_minutes}-{self.end_time_minutes}"
