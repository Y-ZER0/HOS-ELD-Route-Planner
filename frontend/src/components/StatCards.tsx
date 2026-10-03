import { useAppStore } from "@/stores/useAppStore";

export default function StatCards() {
  const activeTrip = useAppStore((s) => s.activeTrip);
  if (!activeTrip) return null;
  const t = activeTrip.trip;

  const fuelStops = t.stops.filter((s) =>
    ((s.stop_type ?? s.stopType) ?? "").toUpperCase().includes("FUEL"),
  ).length;
  const rest10 = t.stops.filter((s) =>
    ((s.stop_type ?? s.stopType) ?? "").toUpperCase().includes("REST_10HR"),
  ).length;
  const remaining = t.remainingCycleHours ?? t.RemainingCycleHours ?? 0;

  const cards = [
    { label: "TOTAL DISTANCE", value: `${Math.round(t.totalDistanceMiles).toLocaleString()} mi` },
    { label: "EST. TRIP TIME", value: `${t.totalTripDurationHours.toFixed(1)} hrs` },
    { label: "10HR REST STOPS", value: `${rest10} Stop${rest10 === 1 ? "" : "s"}` },
    { label: "FUELING STOPS", value: `${fuelStops} Stop${fuelStops === 1 ? "" : "s"}` },
    { label: "CYCLE HOURS LEFT", value: `${Number(remaining).toFixed(1)} hrs` },
  ];

  return (
    <div className="grid min-w-0 grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-5">
      {cards.map((c) => (
        <div key={c.label} className="panel min-w-0 overflow-hidden px-3 py-2.5">
          <p className="text-[9px] font-semibold tracking-wider text-muted-foreground">{c.label}</p>
          <p className="mt-0.5 text-lg font-bold tabular text-foreground">{c.value}</p>
        </div>
      ))}
    </div>
  );
}
