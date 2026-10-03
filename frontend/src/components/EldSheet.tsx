import { useAppStore } from "@/stores/useAppStore";
import EmptyState from "@/components/EmptyState";
import EldGraphGrid from "./EldGraphGrid";
import { getSegLocation, getSegStart, type EldLog } from "@/lib/types";
import { cn } from "@/lib/cn";

function fmtDateLong(iso: string): string {
  try {
    const d = new Date(iso + "T12:00:00");
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

function fmtClock(mins: number): string {
  const h24 = Math.floor(mins / 60) % 24;
  const m = ((mins % 60) + 60) % 60;
  const suffix = h24 < 12 ? "AM" : "PM";
  const h = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h}:${String(m).padStart(2, "0")} ${suffix}`;
}

function shortStatus(s: string): { label: string; cls: string } {
  if (s === "DRIVING") return { label: "D", cls: "text-emerald-700 dark:text-emerald-300" };
  if (s === "ON_DUTY") return { label: "ON", cls: "text-amber-700 dark:text-amber-300" };
  if (s === "SLEEPER") return { label: "SB", cls: "text-violet-700 dark:text-violet-300" };
  return { label: "OFF", cls: "text-slate-500 dark:text-slate-300" };
}

function RemarksTable({ log }: { log: EldLog }) {
  const rows = [...(log.segments ?? [])].sort((a, b) => getSegStart(a) - getSegStart(b));
  return (
    <div className="mt-4 min-w-0 overflow-hidden rounded-lg border border-border">
      <div className="border-b border-border bg-secondary/40 px-4 py-2.5 text-[15px] font-bold text-foreground">
        Remarks &amp; Duty Status Changes
      </div>
      <div className="max-h-72 overflow-auto">
        <table className="w-full min-w-[680px] text-left text-[14px]">
          <thead className="sticky top-0 z-10 bg-card">
            <tr className="text-muted-foreground">
              <th className="whitespace-nowrap px-4 py-2.5 text-[13px] font-medium">Time</th>
              <th className="whitespace-nowrap px-4 py-2.5 text-[13px] font-medium">Status</th>
              <th className="px-4 py-2.5 text-[13px] font-medium">Location (City, State)</th>
              <th className="px-4 py-2.5 text-[13px] font-medium">Remark</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((s, i) => {
              const { label, cls } = shortStatus(s.status);
              const loc = getSegLocation(s) || "—";
              return (
                <tr key={i} className="border-t border-border/60">
                  <td className="whitespace-nowrap px-4 py-2.5 text-muted-foreground tabular">
                    {fmtClock(getSegStart(s))}
                  </td>
                  <td className="whitespace-nowrap px-4 py-2.5">
                    <span className="mr-2 inline-block h-2.5 w-2.5 rounded-full bg-current opacity-80" />
                    <span className={cn("font-semibold", cls)}>{label}</span>
                  </td>
                  <td className="max-w-[240px] truncate px-4 py-2.5 text-foreground" title={loc}>
                    {loc.split("—")[0]?.trim() || loc}
                  </td>
                  <td className="px-4 py-2.5 text-muted-foreground">{loc}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

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
  const idx = Math.min(activeDayIndex, Math.max(0, logs.length - 1));
  const log = logs[idx];
  if (!log) return null;

  const total = log.offDutyHours + log.sleeperBerthHours + log.drivingHours + log.onDutyHours;
  const compliant = log.drivingHours <= 11.01 && total <= 24.01;

  return (
    <section className="panel min-w-0 p-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-[16px] font-bold text-foreground">FMCSA Daily Log Sheets (ELD)</h2>
        <span className="text-[12px] text-muted-foreground">Driver&apos;s Daily Log · 49 CFR §395.8</span>
      </div>

      {/* day tabs */}
      <div className="no-print mb-4 flex flex-wrap gap-1.5 rounded-lg border border-border bg-secondary/30 p-1.5">
        {logs.map((l, i) => {
          const d = new Date(l.date + "T12:00:00");
          const label = `Day ${i + 1} (${d.toLocaleDateString("en-US", { month: "short", day: "numeric" })})`;
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
            <p className="truncate font-semibold text-foreground">{fmtDateLong(log.date)}</p>
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

          <aside className="min-w-0 rounded-lg border border-border p-4 lg:w-[240px]">
            <h4 className="mb-3 text-[15px] font-bold text-foreground">Total Hours</h4>
            <dl className="space-y-2 text-[14px] tabular">
              {[
                ["Off Duty", log.offDutyHours, "bg-slate-400"],
                ["Sleeper Berth", log.sleeperBerthHours, "bg-violet-400"],
                ["Driving", log.drivingHours, "bg-emerald-400"],
                ["On Duty (Not Driving)", log.onDutyHours, "bg-amber-400"],
              ].map(([label, hrs, dot]) => (
                <div key={label as string} className="flex items-center justify-between gap-2">
                  <dt className="flex min-w-0 items-center gap-2 truncate text-muted-foreground">
                    <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${dot}`} />
                    <span className="truncate">{label}</span>
                  </dt>
                  <dd className="shrink-0 font-semibold text-foreground">{Number(hrs).toFixed(2)}</dd>
                </div>
              ))}
              <div className="flex items-center justify-between border-t border-border pt-2">
                <dt className="font-bold text-foreground">Total</dt>
                <dd className="font-bold text-foreground">{total.toFixed(2)}</dd>
              </div>
            </dl>
            <p
              className={cn(
                "mt-3 rounded-md border px-2 py-1.5 text-center text-[14px] font-bold",
                compliant
                  ? "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-400/40 dark:bg-emerald-400/10 dark:text-emerald-300"
                  : "border-red-300 bg-red-50 text-red-700 dark:border-red-400/40 dark:bg-red-400/10 dark:text-red-300",
              )}
            >
              {compliant ? "In Compliance" : "Violation — review"}
            </p>
            <p className="mt-2 text-[12px] leading-snug text-muted-foreground">
              {log.segments.length} segments · {Math.round(log.totalMilesDriven)} mi ·{" "}
              {log.drivingHours.toFixed(1)}h drive
            </p>
          </aside>
        </div>

        <RemarksTable log={log} />
      </div>
    </section>
  );
}
