from django.db import migrations


def seed_driver(apps, schema_editor):
    Driver = apps.get_model("trips", "Driver")
    Driver.objects.get_or_create(
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


def unseed_driver(apps, schema_editor):
    Driver = apps.get_model("trips", "Driver")
    Driver.objects.filter(name="A. Carter").delete()


class Migration(migrations.Migration):
    dependencies = [("trips", "0001_initial")]

    operations = [migrations.RunPython(seed_driver, unseed_driver)]
