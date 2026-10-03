import { useAppStore } from "@/stores/useAppStore";
import EmptyState from "@/components/EmptyState";
import {
  formatArrival,
  formatDuration,
  getDrivingLabel,
  getStopArrival,
  iconFor,
  subtitleFor,
  titleFor,
} from "@/lib/itineraryHelpers";
import { stopDuration } from "@/lib/types";
import { cn } from "@/lib/cn";

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

  const drivingLabel = getDrivingLabel(trip.stops, trip.totalDrivingHours);

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
          const arrival = getStopArrival(s);
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
                    {arrival ? formatArrival(arrival) : ""} · {formatDuration(stopDuration(s))}
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
