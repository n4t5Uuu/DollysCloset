"use client";

import { useState, useMemo, memo } from "react";
import type { Season } from "@dollys-closet/core";
import { PALETTE, SEL_BG, SEL_BORDER } from "@/lib/season-colors";
import { Tooltip, TooltipContent, TooltipTrigger } from "@dollys-closet/ui";

const MONTH_DAYS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31] as const;
const MONTH_ABBR = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"] as const;

const PREV_BG = "#FFF0F4";

function toDOY(m: number, d: number) {
  let t = 0;
  for (let i = 0; i < m - 1; i++) t += MONTH_DAYS[i];
  return t + d;
}

function inRange(m: number, d: number, sm: number, sd: number, em: number, ed: number) {
  const p = toDOY(m, d);
  const s = toDOY(sm, sd);
  const e = toDOY(em, ed);
  return s <= e ? p >= s && p <= e : p >= s || p <= e;
}

interface SeasonCalendarProps {
  seasons: Season[];
  editingSeasonId: string | null;
  startMonth: number;
  startDay: number;
  endMonth: number;
  endDay: number;
  onChange: (startMonth: number, startDay: number, endMonth: number, endDay: number) => void;
}

function SeasonCalendarBase({
  seasons,
  editingSeasonId,
  startMonth,
  startDay,
  endMonth,
  endDay,
  onChange,
}: SeasonCalendarProps) {
  const [anchor, setAnchor] = useState<{ month: number; day: number } | null>(null);
  const [hover, setHover] = useState<{ month: number; day: number } | null>(null);

  // Seasons other than the one currently being edited
  const others = useMemo(
    () => seasons.filter((s) => s.id !== editingSeasonId),
    [seasons, editingSeasonId],
  );

  const colorMap = useMemo(() => {
    const map = new Map<string, { bg: string; border: string }>();
    others.forEach((s, i) => map.set(s.id, PALETTE[i % PALETTE.length]));
    return map;
  }, [others]);

  function seasonForDay(month: number, day: number): Season | null {
    return others.find((s) => inRange(month, day, s.startMonth, s.startDay, s.endMonth, s.endDay)) ?? null;
  }

  function handleClick(month: number, day: number) {
    if (!anchor) {
      setAnchor({ month, day });
      setHover({ month, day });
    } else {
      onChange(anchor.month, anchor.day, month, day);
      setAnchor(null);
      setHover(null);
    }
  }

  const picking = anchor !== null;

  return (
    <div className="rounded-2xl border border-[#E7A3B0]/20 bg-[#fffafc] p-4">
      {/* Status bar */}
      <div className="mb-3 flex min-h-[1.5rem] items-center justify-between text-xs">
        <span className="font-semibold uppercase tracking-wider text-gray-400">Date Range</span>
        {picking ? (
          <div className="flex items-center gap-2 text-[#b96d7d]">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#E7A3B0]" />
            Click end date &mdash; started&nbsp;
            <span className="font-semibold">{MONTH_ABBR[anchor.month - 1]}&nbsp;{anchor.day}</span>
            <button
              type="button"
              className="underline opacity-60 hover:opacity-100"
              onClick={() => { setAnchor(null); setHover(null); }}
            >
              Cancel
            </button>
          </div>
        ) : (
          <span className="text-gray-400">Click a day to start, click again to finish</span>
        )}
      </div>

      {/* 12-month grid */}
      <div
        className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4"
        onMouseLeave={() => picking && setHover(anchor)}
      >
        {MONTH_ABBR.map((abbr, mi) => {
          const month = mi + 1;
          return (
            <div key={month}>
              <div className="mb-1.5 text-center text-[10px] font-bold uppercase tracking-widest text-gray-400">
                {abbr}
              </div>
              <div
                className="grid gap-0.5"
                style={{ gridTemplateColumns: "repeat(7, minmax(0, 1fr))" }}
              >
                {Array.from({ length: MONTH_DAYS[mi] }, (_, di) => {
                  const day = di + 1;
                  const season = seasonForDay(month, day);
                  const sc = season ? colorMap.get(season.id) : null;

                  const isSel =
                    !picking &&
                    inRange(month, day, startMonth, startDay, endMonth, endDay);
                  const isPrev =
                    picking &&
                    anchor !== null &&
                    hover !== null &&
                    inRange(month, day, anchor.month, anchor.day, hover.month, hover.day);

                  let bg = "transparent";
                  let border = "transparent";
                  let fg = "#9CA3AF"; // gray-400

                  if (sc) {
                    bg = sc.bg;
                    border = sc.border;
                    fg = "#374151"; // gray-700
                  } else if (isSel) {
                    bg = SEL_BG;
                    border = SEL_BORDER;
                    fg = "#9D3F5B";
                  } else if (isPrev) {
                    bg = PREV_BG;
                    border = SEL_BORDER;
                    fg = "#b96d7d";
                  }

                  const cell = (
                    <button
                      key={day}
                      type="button"
                      style={{
                        backgroundColor: bg,
                        color: fg,
                        ...(bg !== "transparent"
                          ? { borderWidth: 1, borderStyle: "solid" as const, borderColor: border }
                          : {}),
                      }}
                      className="flex aspect-square w-full cursor-pointer select-none items-center justify-center rounded-[3px] text-[10px] leading-none transition-colors hover:brightness-90"
                      onClick={() => handleClick(month, day)}
                      onMouseEnter={() => picking && setHover({ month, day })}
                    >
                      {day}
                    </button>
                  );

                  if (season) {
                    return (
                      <Tooltip key={day}>
                        <TooltipTrigger asChild>{cell}</TooltipTrigger>
                        <TooltipContent side="top" sideOffset={4}>
                          <p className="font-semibold">{season.name}</p>
                          <p className="text-gray-500">
                            {MONTH_ABBR[season.startMonth - 1]}&nbsp;{season.startDay}
                            &nbsp;–&nbsp;
                            {MONTH_ABBR[season.endMonth - 1]}&nbsp;{season.endDay}
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    );
                  }

                  return cell;
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      {others.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 border-t border-[#E7A3B0]/15 pt-3">
          {others.map((s, i) => {
            const c = PALETTE[i % PALETTE.length];
            return (
              <span key={s.id} className="flex items-center gap-1.5 text-xs text-gray-600">
                <span
                  className="h-2.5 w-2.5 rounded-[2px]"
                  style={{ backgroundColor: c.bg, border: `1px solid ${c.border}` }}
                />
                {s.name}
              </span>
            );
          })}
          <span className="flex items-center gap-1.5 text-xs text-gray-600">
            <span
              className="h-2.5 w-2.5 rounded-[2px]"
              style={{ backgroundColor: SEL_BG, border: `1px solid ${SEL_BORDER}` }}
            />
            {editingSeasonId ? "Editing" : "New season"}
          </span>
        </div>
      )}
    </div>
  );
}

export const SeasonCalendar = memo(SeasonCalendarBase);
