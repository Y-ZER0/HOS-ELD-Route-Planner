import { Moon, Sun, Printer, Trash2 } from "lucide-react";
import { useAppStore } from "@/stores/useAppStore";

export default function Header() {
  const { theme, toggleTheme } = useAppStore();
  const activeTrip = useAppStore((s) => s.activeTrip);
  const setActiveTrip = useAppStore((s) => s.setActiveTrip);
  const setLastRequest = useAppStore((s) => s.setLastRequest);

  const handlePrint = () => window.print();
  const handleClear = () => {
    setActiveTrip(null);
    setLastRequest(null);
  };

  return (
    <header className="no-print flex h-14 shrink-0 items-center justify-between gap-3 border-b border-border bg-card px-4">
      <div className="flex min-w-0 items-center gap-3">
        <img
          src="/spotter-logo.svg"
          alt="Spotter logo"
          className="h-8 w-8 shrink-0 rounded-md"
          width={32}
          height={32}
        />
        <div className="min-w-0">
          <h1 className="truncate text-sm font-semibold leading-tight text-foreground">
            Spotter HOS &amp; Route Compliance Planner
          </h1>
          <p className="truncate text-[11px] leading-tight text-muted-foreground">
            Fleet Management &amp; Electronic Logging
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className="hidden items-center gap-1.5 md:flex">
          {["70hr / 8-Day Rule", "11hr Driving Limit", "Property-Carrying"].map((p) => (
            <span
              key={p}
              className="rounded-full border border-border bg-secondary px-2.5 py-1 text-[10px] font-medium text-secondary-foreground"
            >
              {p}
            </span>
          ))}
        </div>
        <button
          onClick={toggleTheme}
          aria-label="Toggle theme"
          className="flex h-8 w-8 items-center justify-center rounded-md border border-border bg-secondary text-secondary-foreground transition hover:opacity-80"
        >
          {theme === "dark" ? <Sun size={15} /> : <Moon size={15} />}
        </button>
        {activeTrip && (
          <button
            onClick={handleClear}
            title="Clear results (also removes the locally cached trip)"
            className="flex h-8 items-center gap-1.5 rounded-md border border-border bg-secondary px-3 text-xs font-semibold text-secondary-foreground transition hover:opacity-80"
          >
            <Trash2 size={14} />
            <span className="hidden sm:inline">Clear</span>
          </button>
        )}
        <button
          onClick={handlePrint}
          className="flex h-8 items-center gap-1.5 rounded-md bg-primary px-3 text-xs font-semibold text-primary-foreground transition hover:opacity-90"
        >
          <Printer size={14} />
          <span className="hidden sm:inline">Export / Print Log PDFs</span>
          <span className="sm:hidden">Export</span>
        </button>
      </div>
    </header>
  );
}
