import { BedDouble, ClipboardCheck, Coffee, Fuel, MapPin, Navigation, Package, Truck } from "lucide-react";
import { useAppStore } from "@/stores/useAppStore";
import EmptyState from "@/components/EmptyState";
import { stopArrival, stopDuration, stopName, stopTypeUpper, type TripStop } from "@/lib/types";
import { cn } from "@/lib/cn";

function iconFor(stop: TripStop) {
  const t = stopTypeUpper(stop);
  if (t === "PRETRIP") return { Icon: ClipboardCheck, bg: "bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300", label: "On Duty (Not Driving)" };
  if (t === "PICKUP" || t === "DROPOFF") return { Icon: Package, bg: "bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300", label: "On Duty (Not Driving)" };
  if (t === "FUEL") return { Icon: Fuel, bg: "bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300", label: "On Duty (Not Driving)" };
  if (t === "REST_10HR") return { Icon: BedDouble, bg: "bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-300", label: "Sleeper Berth" };
  if (t === "REST_30MIN") return { Icon: Coffee, bg: "bg-slate-200 text-slate-600 dark:bg-slate-400/20 dark:text-slate-300", label: "Off Duty" };
  if (t === "ORIGIN") {
    if ((stop.stopType ?? "").toLowerCase() === "driving")
      return { Icon: Truck, bg: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300", label: "Driving" };
    return { Icon: Navigation, bg: "bg-cyan-100 text-cyan-700 dark:bg-cyan-500/20 dark:text-cyan-300", label: "Origin" };
  }
  return { Icon: MapPin, bg: "bg-cyan-100 text-cyan-700 dark:bg-cyan-500/20 dark:text-cyan-300", label: t };
}

function titleFor(stop: TripStop): string {
  const t = stopTypeUpper(stop);
  const name = stopName(stop);
  const lower = (stop.stopType ?? "").toLowerCase();
  if (lower === "driving") {
    const mins = stopDuration(stop);
    const hrs = mins / 60;
    const h = Math.floor(hrs);
    const m = Math.round((hrs - h) * 60);
    const dur = h > 0 && m > 0 ? `${h} hr ${m} min` : h > 0 ? `${h} hr` : `${m} min`;
    // keep location short: "Nashville, TN — 440 mi" style already in mock
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

function subtitleFor(stop: TripStop): string {
  const t = stopTypeUpper(stop);
  const name = stopName(stop);
  if ((stop.stopType ?? "").toLowerCase() === "driving") {
    // mock already encodes "Nashville, TN — 440 mi"; real engine: "En route (...)"
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

function fmtArrival(iso: string): string {
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

function fmtDur(mins: number): string {
  if (!mins) return "0 min";
  if (mins % 60 === 0) return `${mins / 60} hr`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h === 0) return `${m} min`;
  return `${h} hr ${m} min`;
}

export default function ItineraryList() {
  const activeTrip = useAppStore((s) => s.activeTrip);
  if (!activeTrip) {
    return (
      <EmptyState
        title="No itinerary yet"
        hint="Planned stops will appear here after you generate a compliant route."
        className="min-h-[200px]"
      />
    );
  }
  const trip = activeTrip.trip;

  const drivingMins = trip.stops
    .filter((s) => (s.stopType ?? "").toLowerCase() === "driving" || stopTypeUpper(s) === "DRIVING")
    .reduce((a, s) => a + stopDuration(s), 0);

  // Fall back to totalDrivingHours when stops carry no driving chunks (real API)
  const drivingLabel =
    drivingMins > 0
      ? `${Math.floor(drivingMins / 60)} hr ${drivingMins % 60} min driving`
      : `${trip.totalDrivingHours.toFixed(1)} hr driving`;

  // Build display list: for real API trips, HOS stops have no driving chunks —
  // synthesize readable driving legs between consecutive stops.
  const items = trip.stops;

  return (
    <section className="panel isolate z-0 flex min-h-0 min-w-0 flex-col overflow-hidden">
      <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-3.5">
        <h2 className="shrink-0 text-[17px] font-bold tracking-tight text-foreground">Route Itinerary</h2>
        <span className="truncate text-[12px] text-muted-foreground tabular">
          {items.length} stops · {drivingLabel}
        </span>
      </div>
      <div className="max-h-[560px] min-w-0 flex-1 overflow-y-auto overflow-x-hidden px-5 py-3">
        {items.map((s, idx) => {
          const { Icon, bg, label } = iconFor(s);
          const arrival = stopArrival(s);
          return (
            <div key={`${s.stopSequence}-${idx}`} className="relative flex min-w-0 gap-3.5 pb-6 last:pb-1">
              {idx < items.length - 1 && (
                <span className="absolute left-[19px] top-11 h-[calc(100%-32px)] w-px bg-border" />
              )}
              <span className={cn("z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full", bg)}>
                <Icon size={18} strokeWidth={2.2} />
              </span>
              <div className="min-w-0 flex-1 overflow-hidden pt-0.5">
                <div className="flex min-w-0 items-start justify-between gap-3">
                  <p className="min-w-0 flex-1 text-[15px] font-semibold leading-snug text-foreground">
                    <span className={cn("mr-2 inline-block rounded-md px-2 py-0.5 align-middle text-[11px] font-bold leading-tight", bg)}>
                      {label}
                    </span>
                    <span className="break-words">{titleFor(s)}</span>
                  </p>
                  <span className="w-[168px] shrink-0 pt-0.5 text-right text-[12px] leading-tight text-muted-foreground tabular">
                    {arrival ? fmtArrival(arrival) : ""} · {fmtDur(stopDuration(s))}
                  </span>
                </div>
                <p className="mt-1 truncate text-[13px] leading-snug text-muted-foreground" title={subtitleFor(s)}>{subtitleFor(s)}</p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
