import { useAppStore } from "@/stores/useAppStore";
import EmptyState from "@/components/EmptyState";
import EldGraphGrid from "./EldGraphGrid";
import EldRemarksTable from "@/components/eld/EldRemarksTable";
import EldTotalsAside from "@/components/eld/EldTotalsAside";
import {
  clampDayIndex,
  formatDateLong,
  formatDayTabLabel,
} from "@/lib/eldHelpers";
import { cn } from "@/lib/cn";

export default function EldSheet() {
  const activeTrip = useAppStore((s) => s.activeTrip);
  const activeDayIndex = useAppStore((s) => s.activeDayIndex);
  const setActiveDayIndex = useAppStore((s) => s.setActiveDayIndex);

  const data = activeTrip;
  if (!data) {
    return (
      <EmptyState
        title="No ELD logs yet"
        hint="Generate a compliant route and the daily log sheets, duty graph, and remarks will appear here."
      />
    );
  }
  const logs = data.trip.logs;
  const idx = clampDayIndex(activeDayIndex, logs.length);
  const log = logs[idx];
  if (!log) return null;

  return (
    <section className="panel min-w-0 p-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-[16px] font-bold text-foreground">FMCSA Daily Log Sheets (ELD)</h2>
        <span className="text-[12px] text-muted-foreground">Driver&apos;s Daily Log · 49 CFR §395.8</span>
      </div>

      {/* day tabs */}
      <div className="no-print mb-4 flex flex-wrap gap-1.5 rounded-lg border border-border bg-secondary/30 p-1.5">
        {logs.map((l, i) => {
          const label = formatDayTabLabel(l.date, i);
          const active = i === idx;
          return (
            <button
              key={l.date}
              onClick={() => setActiveDayIndex(i)}
              className={cn(
                "flex items-center gap-1.5 rounded-md px-3.5 py-2 text-[13px] font-medium transition",
                active ? "bg-primary/20 text-foreground" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {label}
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            </button>
          );
        })}
      </div>

      <div className="eld-page min-w-0 rounded-lg border border-border p-4">
        {/* header grid — 1 col on mobile, 2 on sm, 4 on xl to avoid squeeze/overlap */}
        <div className="grid min-w-0 grid-cols-1 gap-x-8 gap-y-4 rounded-lg border border-border bg-secondary/20 p-4 text-[15px] sm:grid-cols-2 xl:grid-cols-4">
          <div className="min-w-0">
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">24-Hour Period Starting</p>
            <p className="truncate font-semibold text-foreground">{formatDateLong(log.date)}</p>
            <p className="mt-2.5 text-[11px] uppercase tracking-wider text-muted-foreground">Total Miles Driven Today</p>
            <p className="font-semibold text-foreground tabular">{Math.round(log.totalMilesDriven)} mi</p>
          </div>
          <div className="min-w-0">
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Carrier</p>
            <p className="truncate font-semibold text-foreground" title={data.driver.carrierName}>{data.driver.carrierName}</p>
            <p className="mt-2.5 text-[11px] uppercase tracking-wider text-muted-foreground">Home Terminal</p>
            <p className="truncate font-semibold text-foreground" title={data.driver.homeTerminal}>{data.driver.homeTerminal}</p>
          </div>
          <div className="min-w-0">
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Driver</p>
            <p className="truncate font-semibold text-foreground">
              {data.driver.name} · CDL #{data.driver.cdlNumber}
            </p>
            <p className="mt-2.5 text-[11px] uppercase tracking-wider text-muted-foreground">Main Office</p>
            <p className="truncate font-semibold text-foreground" title={data.driver.mainOffice}>{data.driver.mainOffice}</p>
          </div>
          <div className="min-w-0">
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Tractor / Trailer</p>
            <p className="truncate font-semibold text-foreground tabular" title={data.driver.tractorNumber}>{data.driver.tractorNumber}</p>
            <p className="mt-2.5 text-[11px] uppercase tracking-wider text-muted-foreground">Shipping Document</p>
            <p className="truncate font-semibold text-foreground">BOL {data.driver.bolNumber}</p>
          </div>
        </div>

        {/* graph + totals — grid (not flex) so columns never overlap */}
        <div className="mt-4 grid min-w-0 grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1fr)_240px]">
          <div className="min-w-0 overflow-hidden rounded-lg border border-border p-3">
            <EldGraphGrid segments={log.segments} />
          </div>

          <EldTotalsAside log={log} />
        </div>

        <EldRemarksTable log={log} />
      </div>
    </section>
  );
}
