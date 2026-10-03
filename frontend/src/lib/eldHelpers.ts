import { getSegLocation, getSegStart, type EldLog } from "@/lib/types";

export function formatDateLong(iso: string): string {
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

export function formatClock(mins: number): string {
  const h24 = Math.floor(mins / 60) % 24;
  const m = ((mins % 60) + 60) % 60;
  const suffix = h24 < 12 ? "AM" : "PM";
  const h = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h}:${String(m).padStart(2, "0")} ${suffix}`;
}

export interface StatusBadge {
  label: string;
  cls: string;
}

export function shortStatus(s: string): StatusBadge {
  if (s === "DRIVING") return { label: "D", cls: "text-emerald-700 dark:text-emerald-300" };
  if (s === "ON_DUTY") return { label: "ON", cls: "text-amber-700 dark:text-amber-300" };
  if (s === "SLEEPER") return { label: "SB", cls: "text-violet-700 dark:text-violet-300" };
  return { label: "OFF", cls: "text-slate-500 dark:text-slate-300" };
}

export function getDayTotal(log: EldLog): number {
  return log.offDutyHours + log.sleeperBerthHours + log.drivingHours + log.onDutyHours;
}

export function isCompliantDay(log: EldLog): boolean {
  return log.drivingHours <= 11.01 && getDayTotal(log) <= 24.01;
}

export function clampDayIndex(activeDayIndex: number, logCount: number): number {
  if (logCount <= 0) return 0;
  return Math.min(Math.max(0, activeDayIndex), logCount - 1);
}

export function formatDayTabLabel(dateIso: string, index: number): string {
  const d = new Date(dateIso + "T12:00:00");
  return `Day ${index + 1} (${d.toLocaleDateString("en-US", { month: "short", day: "numeric" })})`;
}

/** Segments sorted chronologically for the remarks table. */
export function getSortedSegments(log: EldLog) {
  return [...(log.segments ?? [])].sort((a, b) => getSegStart(a) - getSegStart(b));
}

/** Primary location cell: text before the "—" remark separator. */
export function getPrimaryLocation(fullLocation: string): string {
  if (!fullLocation) return "—";
  return fullLocation.split("—")[0]?.trim() || fullLocation;
}

export function getRemarkLocation(segment: { remark_location?: string; location?: string }): string {
  return getSegLocation(segment as never) || "—";
}
