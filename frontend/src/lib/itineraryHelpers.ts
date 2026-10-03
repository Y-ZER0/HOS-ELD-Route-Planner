import {
  BedDouble,
  ClipboardCheck,
  Coffee,
  Fuel,
  MapPin,
  Navigation,
  Package,
  Truck,
  type LucideIcon,
} from "lucide-react";
import { stopArrival, stopDuration, stopName, stopTypeUpper, type TripStop } from "@/lib/types";

export interface StopIcon {
  Icon: LucideIcon;
  bg: string;
  label: string;
}

const ON_DUTY_BG =
  "bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300";

export function iconFor(stop: TripStop): StopIcon {
  const t = stopTypeUpper(stop);
  if (t === "PRETRIP")
    return { Icon: ClipboardCheck, bg: ON_DUTY_BG, label: "On Duty (Not Driving)" };
  if (t === "PICKUP" || t === "DROPOFF")
    return { Icon: Package, bg: ON_DUTY_BG, label: "On Duty (Not Driving)" };
  if (t === "FUEL") return { Icon: Fuel, bg: ON_DUTY_BG, label: "On Duty (Not Driving)" };
  if (t === "REST_10HR")
    return {
      Icon: BedDouble,
      bg: "bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-300",
      label: "Sleeper Berth",
    };
  if (t === "REST_30MIN")
    return {
      Icon: Coffee,
      bg: "bg-slate-200 text-slate-600 dark:bg-slate-400/20 dark:text-slate-300",
      label: "Off Duty",
    };
  if (t === "ORIGIN") {
    if ((stop.stopType ?? "").toLowerCase() === "driving")
      return {
        Icon: Truck,
        bg: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300",
        label: "Driving",
      };
    return {
      Icon: Navigation,
      bg: "bg-cyan-100 text-cyan-700 dark:bg-cyan-500/20 dark:text-cyan-300",
      label: "Origin",
    };
  }
  return {
    Icon: MapPin,
    bg: "bg-cyan-100 text-cyan-700 dark:bg-cyan-500/20 dark:text-cyan-300",
    label: t,
  };
}

export function titleFor(stop: TripStop): string {
  const t = stopTypeUpper(stop);
  const name = stopName(stop);
  const lower = (stop.stopType ?? "").toLowerCase();
  if (lower === "driving") {
    const mins = stopDuration(stop);
    const hrs = mins / 60;
    const h = Math.floor(hrs);
    const m = Math.round((hrs - h) * 60);
    const dur = h > 0 && m > 0 ? `${h} hr ${m} min` : h > 0 ? `${h} hr` : `${m} min`;
    return `Driving ${dur}`;
  }
  if (t === "PRETRIP") return "Pre-Trip Inspection";
  if (t === "REST_30MIN") return "30 min Rest Break";
  if (t === "REST_10HR") return "10 hr Mandatory Rest";
  if (t === "FUEL") return "Fuel Stop";
  if (t === "PICKUP") return "Pickup — Loading";
  if (t === "DROPOFF") return "Drop-off — Unloading";
  if (t === "ORIGIN") return `Origin — ${name}`;
  return name;
}

export function subtitleFor(stop: TripStop): string {
  const t = stopTypeUpper(stop);
  const name = stopName(stop);
  if ((stop.stopType ?? "").toLowerCase() === "driving") {
    const short = name.replace(/^En route \((.*)\)$/, "$1");
    return `${short} — Driving toward destination`;
  }
  if (t === "PRETRIP") return `${name.replace(/^Pre-trip inspection — /, "")} — Pre-trip vehicle inspection`;
  if (t === "REST_30MIN") return `${name} — Required 30-minute break after 8 hrs driving`;
  if (t === "REST_10HR") return `${name} — 10-hour off-duty reset (sleeper berth)`;
  if (t === "FUEL") return `${name} — Fuel (30 min, on duty)`;
  if (t === "PICKUP") return `${name} — 1 hr loading (on duty)`;
  if (t === "DROPOFF") return `${name} — 1 hr unloading (on duty)`;
  return name;
}

export function formatArrival(iso: string): string {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return (
      d.toLocaleDateString("en-US", { month: "short", day: "numeric" }) +
      ", " +
      d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
    );
  } catch {
    return iso;
  }
}

export function formatDuration(mins: number): string {
  if (!mins) return "0 min";
  if (mins % 60 === 0) return `${mins / 60} hr`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h === 0) return `${m} min`;
  return `${h} hr ${m} min`;
}

export function isDrivingStop(stop: TripStop): boolean {
  return (
    (stop.stopType ?? "").toLowerCase() === "driving" || stopTypeUpper(stop) === "DRIVING"
  );
}

export function getDrivingMinutes(stops: TripStop[]): number {
  return stops.filter(isDrivingStop).reduce((a, s) => a + stopDuration(s), 0);
}

export function getDrivingLabel(stops: TripStop[], totalDrivingHours: number): string {
  const drivingMins = getDrivingMinutes(stops);
  if (drivingMins > 0) {
    return `${Math.floor(drivingMins / 60)} hr ${drivingMins % 60} min driving`;
  }
  return `${totalDrivingHours.toFixed(1)} hr driving`;
}

export function getStopArrival(stop: TripStop): string {
  return stopArrival(stop);
}
