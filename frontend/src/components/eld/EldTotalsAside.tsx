import type { EldLog } from "@/lib/types";
import { getDayTotal, isCompliantDay } from "@/lib/eldHelpers";
import { cn } from "@/lib/cn";

export default function EldTotalsAside({ log }: { log: EldLog }) {
  const total = getDayTotal(log);
  const compliant = isCompliantDay(log);

  return (
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
  );
}
