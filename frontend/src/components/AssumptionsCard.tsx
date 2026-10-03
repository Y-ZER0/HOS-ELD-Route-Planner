import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/cn";

const RULES = [
  "10 hr mandatory off-duty rest between shifts",
  "11 hr maximum driving within a 14 hr on-duty window",
  "30 min break required after 8 cumulative driving hours",
  "70 hr / 8-day cycle limit, property-carrying driver",
  "Fuel stop every 1,000 miles (30 min, on duty)",
  "1 hr on duty for pickup and for drop-off",
  "Average planning speed: 55 mph",
];

export default function AssumptionsCard() {
  const [open, setOpen] = useState(false);

  return (
    <section className="panel no-print overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls="preset-rule-assumptions"
        className="flex w-full items-center justify-between gap-2 p-4 text-left transition hover:opacity-80"
      >
        <h3 className="text-xs font-semibold text-foreground">Preset Rule Assumptions</h3>
        <ChevronDown
          size={14}
          className={cn(
            "shrink-0 text-muted-foreground transition-transform duration-200",
            open && "rotate-180",
          )}
        />
      </button>
      <div
        id="preset-rule-assumptions"
        className={cn(
          "grid transition-all duration-200 ease-in-out",
          open ? "[grid-template-rows:1fr] opacity-100" : "[grid-template-rows:0fr] opacity-0",
        )}
      >
        <div className="overflow-hidden">
          <ul className="space-y-1.5 px-4 pb-4">
            {RULES.map((r) => (
              <li key={r} className="flex items-start gap-2 text-[11px] leading-snug text-muted-foreground">
                <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-cyan-400" />
                {r}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
