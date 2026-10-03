import type { EldLog } from "@/lib/types";
import {
  formatClock,
  getPrimaryLocation,
  getRemarkLocation,
  getSortedSegments,
  shortStatus,
} from "@/lib/eldHelpers";
import { cn } from "@/lib/cn";

export default function EldRemarksTable({ log }: { log: EldLog }) {
  const rows = getSortedSegments(log);
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
              const loc = getRemarkLocation(s);
              return (
                <tr key={i} className="border-t border-border/60">
                  <td className="whitespace-nowrap px-4 py-2.5 text-muted-foreground tabular">
                    {formatClock(s.start_time_minutes ?? s.startMinutes ?? 0)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-2.5">
                    <span className="mr-2 inline-block h-2.5 w-2.5 rounded-full bg-current opacity-80" />
                    <span className={cn("font-semibold", cls)}>{label}</span>
                  </td>
                  <td className="max-w-[240px] truncate px-4 py-2.5 text-foreground" title={loc}>
                    {getPrimaryLocation(loc)}
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
