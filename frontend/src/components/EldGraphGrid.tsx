import { useMemo, useRef, useState } from "react";
import { getSegDurationMin, getSegEnd, getSegLocation, getSegStart, type LogSegment } from "@/lib/types";

const ROWS = [
  { key: "OFF_DUTY", label: "1. Off Duty", sub: null },
  { key: "SLEEPER", label: "2. Sleeper Berth", sub: null },
  { key: "DRIVING", label: "3. Driving", sub: null },
  { key: "ON_DUTY", label: "4. On Duty", sub: "(Not Driving)" },
] as const;

const Y: Record<string, number> = {
  OFF_DUTY: 22,
  SLEEPER: 72,
  DRIVING: 122,
  ON_DUTY: 172,
};

const STATUS_LABEL: Record<string, string> = {
  OFF_DUTY: "Off Duty",
  SLEEPER: "Sleeper Berth",
  DRIVING: "Driving",
  ON_DUTY: "On Duty (Not Driving)",
};

const STATUS_COLOR: Record<string, string> = {
  OFF_DUTY: "#94a3b8",
  SLEEPER: "#a78bfa",
  DRIVING: "#34d399",
  ON_DUTY: "#fbbf24",
};

const GUTTER = 172;
const W = 880;
const H = 200;
const ROW_LABEL_SIZE = 12;
const ROW_SUB_SIZE = 10.5;

export function buildStepPath(segments: LogSegment[]): string {
  const segs = [...segments].sort((a, b) => getSegStart(a) - getSegStart(b));
  let d = "";
  segs.forEach((seg, idx) => {
    const x1 = GUTTER + (getSegStart(seg) / 1440) * W;
    const x2 = GUTTER + (getSegEnd(seg) / 1440) * W;
    const y = Y[seg.status] ?? Y.OFF_DUTY;
    if (idx === 0) d += `M ${x1.toFixed(1)} ${y} L ${x2.toFixed(1)} ${y}`;
    else d += ` L ${x1.toFixed(1)} ${y} L ${x2.toFixed(1)} ${y}`;
  });
  return d;
}

function fmtClock(mins: number): string {
  const h24 = Math.floor(mins / 60) % 24;
  const m = ((mins % 60) + 60) % 60;
  const suffix = h24 < 12 ? "AM" : "PM";
  const h = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h}:${String(m).padStart(2, "0")} ${suffix}`;
}

function fmtDur(mins: number): string {
  const m = Math.max(0, Math.round(mins));
  const h = Math.floor(m / 60);
  const r = m % 60;
  if (h === 0) return `${r}m`;
  if (r === 0) return `${h}h`;
  return `${h}h ${r}m`;
}

const HOUR_LABELS = ["M", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "N", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11"];

export default function EldGraphGrid({ segments }: { segments: LogSegment[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const [anchor, setAnchor] = useState<{ x: number; y: number } | null>(null);

  const sorted = useMemo(() => [...segments].sort((a, b) => getSegStart(a) - getSegStart(b)), [segments]);
  const pathD = useMemo(() => buildStepPath(sorted), [sorted]);

  // Duty-color band behind every segment (matches Image 2 highlight style)
  const shades = useMemo(
    () =>
      sorted.map((s) => {
        const x = GUTTER + (getSegStart(s) / 1440) * W;
        const w = ((getSegEnd(s) - getSegStart(s)) / 1440) * W;
        const y = (Y[s.status] ?? Y.OFF_DUTY) - 18;
        return { x, w, y, color: STATUS_COLOR[s.status] ?? "#94a3b8" };
      }),
    [sorted],
  );

  const hoverTargets = useMemo(
    () =>
      sorted.map((s) => {
        const rawX = GUTTER + (getSegStart(s) / 1440) * W;
        const rawW = ((getSegEnd(s) - getSegStart(s)) / 1440) * W;
        // widen razor-thin segments so they stay hoverable
        const minW = 14;
        const w = Math.max(rawW, minW);
        const x = rawW < minW ? rawX - (minW - rawW) / 2 : rawX;
        return { x, w };
      }),
    [sorted],
  );

  const updateAnchor = (e: React.MouseEvent) => {
    const el = containerRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setAnchor({ x: e.clientX - r.left, y: e.clientY - r.top });
  };

  const hovered = hoveredIdx != null ? sorted[hoveredIdx] : null;
  const hoveredColor = hovered ? (STATUS_COLOR[hovered.status] ?? "#22d3ee") : "#22d3ee";

  // clamp popup horizontally so it never clips at the edges
  const POP_W = 250;
  const popupLeft = anchor ? Math.min(Math.max(anchor.x, POP_W / 2 + 8), Math.max(POP_W / 2 + 8, (containerRef.current?.clientWidth ?? 800) - POP_W / 2 - 8)) : 0;

  return (
    <div ref={containerRef} className="relative w-full min-w-0">
      <div className="w-full min-w-0 overflow-x-auto">
        <svg
          viewBox={`0 0 ${GUTTER + W + 12} ${H + 30}`}
          className="h-auto w-full min-w-[640px]"
          role="img"
          aria-label="ELD duty status graph"
        >
          {/* hour labels */}
          {HOUR_LABELS.map((lbl, hr) => {
            const x = GUTTER + (hr / 24) * W;
            return (
              <text
                key={hr}
                x={x}
                y={12}
                textAnchor="middle"
                fontSize={11}
                fill="currentColor"
                className="fill-muted-foreground"
              >
                {lbl}
              </text>
            );
          })}

          <g transform="translate(0,20)">
            {/* row labels — fixed gutter + two-line last row so text never overlaps the grid */}
            {ROWS.map((row) =>
              row.sub ? (
                <text
                  key={row.key}
                  x={10}
                  y={(Y[row.key] ?? 0) - 1}
                  fontSize={ROW_LABEL_SIZE}
                  fontWeight={600}
                  fill="currentColor"
                  className="fill-foreground"
                >
                  <tspan x={10} dy={0}>
                    {row.label}
                  </tspan>
                  <tspan x={10} dy={ROW_SUB_SIZE + 2} fontSize={ROW_SUB_SIZE} fontWeight={500} className="fill-muted-foreground">
                    {row.sub}
                  </tspan>
                </text>
              ) : (
                <text
                  key={row.key}
                  x={10}
                  y={(Y[row.key] ?? 0) + 4}
                  fontSize={ROW_LABEL_SIZE}
                  fontWeight={600}
                  fill="currentColor"
                  className="fill-foreground"
                >
                  {row.label}
                </text>
              ),
            )}

            {/* row grid */}
            {ROWS.map((row) => (
              <g key={row.key}>
                <line x1={GUTTER} y1={Y[row.key]} x2={GUTTER + W} y2={Y[row.key]} stroke="var(--color-grid-line)" strokeWidth={1} opacity={0.9} />
                <line x1={GUTTER} y1={Y[row.key] + 25} x2={GUTTER + W} y2={Y[row.key] + 25} stroke="var(--color-grid-line)" strokeWidth={0.5} opacity={0.5} />
              </g>
            ))}
            {/* vertical hour lines */}
            {Array.from({ length: 25 }).map((_, hr) => {
              const x = GUTTER + (hr / 24) * W;
              return (
                <line
                  key={hr}
                  x1={x}
                  y1={0}
                  x2={x}
                  y2={H - 10}
                  stroke="var(--color-grid-line)"
                  strokeWidth={hr % 2 === 0 ? 1 : 0.5}
                  opacity={hr % 2 === 0 ? 0.9 : 0.5}
                />
              );
            })}
            {/* half-hour faint lines */}
            {Array.from({ length: 48 }).map((_, h) => {
              if (h % 2 === 0) return null;
              const x = GUTTER + (h / 48) * W;
              return (
                <line key={h} x1={x} y1={0} x2={x} y2={H - 10} stroke="var(--color-grid-line)" strokeWidth={0.4} opacity={0.3} />
              );
            })}

            {/* duty-color shades for ALL statuses */}
            {shades.map((s, i) => (
              <rect
                key={i}
                x={s.x}
                y={s.y}
                width={Math.max(0, s.w)}
                height={30}
                fill={s.color}
                opacity={hoveredIdx === i ? 0.34 : 0.18}
                style={{ transition: "opacity 160ms ease" }}
              />
            ))}

            {/* hover highlight outline */}
            {hoveredIdx != null && shades[hoveredIdx] && (
              <rect
                x={shades[hoveredIdx].x}
                y={shades[hoveredIdx].y}
                width={Math.max(2, shades[hoveredIdx].w)}
                height={30}
                fill="none"
                stroke={shades[hoveredIdx].color}
                strokeWidth={1.5}
                opacity={0.9}
                rx={2}
                pointerEvents="none"
              />
            )}

            {/* duty step line */}
            <path
              d={pathD}
              fill="none"
              stroke="#22d3ee"
              strokeWidth={3}
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* hover targets */}
            {hoverTargets.map((t, i) => (
              <rect
                key={i}
                x={t.x}
                y={0}
                width={t.w}
                height={H - 10}
                fill="transparent"
                style={{ cursor: "pointer" }}
                onMouseEnter={(e) => {
                  setHoveredIdx(i);
                  updateAnchor(e);
                }}
                onMouseMove={updateAnchor}
                onMouseLeave={() => {
                  setHoveredIdx(null);
                  setAnchor(null);
                }}
              />
            ))}
          </g>
        </svg>
      </div>

      {/* animated hover popup — follows cursor, shows times + status + location */}
      {hovered && anchor && (
        <div
          className="eld-pop pointer-events-none absolute z-20"
          style={{ left: popupLeft, top: Math.max(anchor.y - 8, 90), width: POP_W }}
          role="status"
          aria-live="polite"
        >
          <div className="overflow-hidden rounded-lg border bg-card shadow-xl" style={{ borderColor: `${hoveredColor}55` }}>
            <div className="h-1 w-full" style={{ background: hoveredColor }} />
            <div className="px-3 py-2">
              <p className="flex items-center gap-1.5 text-[11px] font-bold text-foreground">
                <span className="inline-block h-2 w-2 shrink-0 rounded-full" style={{ background: hoveredColor }} />
                {STATUS_LABEL[hovered.status] ?? hovered.status}
                <span className="ml-auto font-semibold text-muted-foreground tabular">
                  {fmtDur(getSegDurationMin(hovered))}
                </span>
              </p>
              <p className="mt-1 text-[12px] font-semibold text-foreground tabular">
                {fmtClock(getSegStart(hovered))} – {fmtClock(getSegEnd(hovered))}
              </p>
              <p className="mt-0.5 truncate text-[11px] text-muted-foreground" title={getSegLocation(hovered) || "—"}>
                {getSegLocation(hovered) || "—"}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
