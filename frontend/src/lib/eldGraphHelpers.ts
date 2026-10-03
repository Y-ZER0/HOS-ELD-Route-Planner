import { getSegDurationMin, getSegEnd, getSegStart, type LogSegment } from "@/lib/types";

export const ROWS = [
  { key: "OFF_DUTY", label: "1. Off Duty", sub: null },
  { key: "SLEEPER", label: "2. Sleeper Berth", sub: null },
  { key: "DRIVING", label: "3. Driving", sub: null },
  { key: "ON_DUTY", label: "4. On Duty", sub: "(Not Driving)" },
] as const;

export type EldRowKey = (typeof ROWS)[number]["key"];

export const Y: Record<string, number> = {
  OFF_DUTY: 22,
  SLEEPER: 72,
  DRIVING: 122,
  ON_DUTY: 172,
};

export const STATUS_LABEL: Record<string, string> = {
  OFF_DUTY: "Off Duty",
  SLEEPER: "Sleeper Berth",
  DRIVING: "Driving",
  ON_DUTY: "On Duty (Not Driving)",
};

export const STATUS_COLOR: Record<string, string> = {
  OFF_DUTY: "#94a3b8",
  SLEEPER: "#a78bfa",
  DRIVING: "#34d399",
  ON_DUTY: "#fbbf24",
};

export const GUTTER = 172;
export const GRAPH_W = 880;
export const GRAPH_H = 200;
export const ROW_LABEL_SIZE = 12;
export const ROW_SUB_SIZE = 10.5;
export const HOUR_LABELS = [
  "M", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11",
  "N", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11",
];
export const POPUP_WIDTH = 250;
export const MIN_HOVER_WIDTH = 14;

export function rowY(status: string): number {
  return Y[status] ?? Y.OFF_DUTY;
}

export function statusColor(status: string): string {
  return STATUS_COLOR[status] ?? "#94a3b8";
}

export function sortSegments(segments: LogSegment[]): LogSegment[] {
  return [...segments].sort((a, b) => getSegStart(a) - getSegStart(b));
}

export function buildStepPath(segments: LogSegment[]): string {
  const segs = sortSegments(segments);
  let d = "";
  segs.forEach((seg, idx) => {
    const x1 = GUTTER + (getSegStart(seg) / 1440) * GRAPH_W;
    const x2 = GUTTER + (getSegEnd(seg) / 1440) * GRAPH_W;
    const y = rowY(seg.status);
    if (idx === 0) d += `M ${x1.toFixed(1)} ${y} L ${x2.toFixed(1)} ${y}`;
    else d += ` L ${x1.toFixed(1)} ${y} L ${x2.toFixed(1)} ${y}`;
  });
  return d;
}

export interface ShadeRect {
  x: number;
  w: number;
  y: number;
  color: string;
}

/** Duty-color band behind every segment. */
export function buildShades(sorted: LogSegment[]): ShadeRect[] {
  return sorted.map((s) => {
    const x = GUTTER + (getSegStart(s) / 1440) * GRAPH_W;
    const w = ((getSegEnd(s) - getSegStart(s)) / 1440) * GRAPH_W;
    const y = rowY(s.status) - 18;
    return { x, w, y, color: statusColor(s.status) };
  });
}

export interface HoverTarget {
  x: number;
  w: number;
}

/** Widen razor-thin segments so they stay hoverable. */
export function buildHoverTargets(sorted: LogSegment[]): HoverTarget[] {
  return sorted.map((s) => {
    const rawX = GUTTER + (getSegStart(s) / 1440) * GRAPH_W;
    const rawW = ((getSegEnd(s) - getSegStart(s)) / 1440) * GRAPH_W;
    const w = Math.max(rawW, MIN_HOVER_WIDTH);
    const x = rawW < MIN_HOVER_WIDTH ? rawX - (MIN_HOVER_WIDTH - rawW) / 2 : rawX;
    return { x, w };
  });
}

export function formatClock(mins: number): string {
  const h24 = Math.floor(mins / 60) % 24;
  const m = ((mins % 60) + 60) % 60;
  const suffix = h24 < 12 ? "AM" : "PM";
  const h = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h}:${String(m).padStart(2, "0")} ${suffix}`;
}

export function formatDuration(mins: number): string {
  const m = Math.max(0, Math.round(mins));
  const h = Math.floor(m / 60);
  const r = m % 60;
  if (h === 0) return `${r}m`;
  if (r === 0) return `${h}h`;
  return `${h}h ${r}m`;
}

export function formatSegmentDuration(seg: LogSegment): string {
  return formatDuration(getSegDurationMin(seg));
}

/** Clamp popup horizontally so it never clips at the edges. */
export function clampPopupLeft(
  anchorX: number,
  containerWidth: number,
  popupWidth: number = POPUP_WIDTH,
): number {
  const margin = popupWidth / 2 + 8;
  return Math.min(Math.max(anchorX, margin), Math.max(margin, containerWidth - margin));
}
