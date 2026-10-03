"""Seed (or verify) the default driver. Idempotent — safe to re-run.

Usage (local SQLite):
    python manage.py seed_driver

Usage (Supabase — after setting DATABASE_URL, then migrate):
    DATABASE_URL='postgresql://postgres:<pw>@db.<ref>.supabase.co:5432/postgres?sslmode=require' \
        python manage.py migrate
    DATABASE_URL='...' python manage.py seed_driver
"""

from django.core.management.base import BaseCommand

from trips.repositories.trip_repository import TripRepository


class Command(BaseCommand):
    help = "Seed the default driver (A. Carter / Spotter Logistics LLC). Idempotent."

    def handle(self, *args, **options):
        driver = TripRepository.get_or_create_default_driver()
        self.stdout.write(
            self.style.SUCCESS(
                f"Default driver ready: {driver.name} ({driver.id}) — "
                f"{driver.carrier_name}, {driver.tractor_number}/{driver.trailer_number}"
            )
        )
