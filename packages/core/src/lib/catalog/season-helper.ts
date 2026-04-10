import { createClient } from "../supabase/browser";
import type { Season } from "../../types/product.types";

export type SeasonRow = {
    season_id: string;
    season_name: string;
    start_month: number;
    start_day: number;
    end_month: number;
    end_day: number;
    is_active?: boolean;
};

const MONTH_DAYS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

function maxDayForMonth(month: number) {
    if (month < 1 || month > 12) return 0;
    return MONTH_DAYS[month - 1];
}

function toDayOfYear(month: number, day: number) {
    let total = 0;
    for (let idx = 0; idx < month - 1; idx++) {
        total += MONTH_DAYS[idx];
    }
    return total + day;
}

function isValidSeasonWindow(row: SeasonRow) {
    if (!Number.isInteger(row.start_month) || !Number.isInteger(row.end_month)) return false;
    if (!Number.isInteger(row.start_day) || !Number.isInteger(row.end_day)) return false;
    if (row.start_month < 1 || row.start_month > 12) return false;
    if (row.end_month < 1 || row.end_month > 12) return false;
    if (row.start_day < 1 || row.start_day > maxDayForMonth(row.start_month)) return false;
    if (row.end_day < 1 || row.end_day > maxDayForMonth(row.end_month)) return false;
    return true;
}

function getSegments(row: SeasonRow) {
    const start = toDayOfYear(row.start_month, row.start_day);
    const end = toDayOfYear(row.end_month, row.end_day);

    if (start <= end) {
        return [{ start, end }];
    }

    return [
        { start, end: 365 },
        { start: 1, end },
    ];
}

function intersects(a: { start: number; end: number }, b: { start: number; end: number }) {
    return a.start <= b.end && b.start <= a.end;
}

export function windowsOverlap(a: SeasonRow, b: SeasonRow) {
    if (!isValidSeasonWindow(a) || !isValidSeasonWindow(b)) return false;

    const aSegments = getSegments(a);
    const bSegments = getSegments(b);

    return aSegments.some((aSegment) => bSegments.some((bSegment) => intersects(aSegment, bSegment)));
}

export function isDateInsideSeason(row: SeasonRow, date: Date) {
    if (!isValidSeasonWindow(row)) return false;

    const probe = toDayOfYear(date.getMonth() + 1, date.getDate());
    const start = toDayOfYear(row.start_month, row.start_day);
    const end = toDayOfYear(row.end_month, row.end_day);

    if (start <= end) {
        return probe >= start && probe <= end;
    }

    return probe >= start || probe <= end;
}

export function mapSeasonRow(row: SeasonRow): Season {
    return {
        id: String(row.season_id),
        name: row.season_name,
        startMonth: Number(row.start_month),
        startDay: Number(row.start_day),
        endMonth: Number(row.end_month),
        endDay: Number(row.end_day),
        isActive: row.is_active !== false,
    };
}

export const seasonHelper = {
    async getSeasons(supabase = createClient()) {
        const { data, error } = await supabase
            .from("tbl_season")
            .select("season_id, season_name, start_month, start_day, end_month, end_day, is_active")
            .order("season_name", { ascending: true });

        if (error) {
            return { data: null, error };
        }

        return { data: (data || []) as SeasonRow[], error: null };
    },

    getActiveSeason(rows: SeasonRow[], now = new Date()) {
        const activeRows = rows.filter((row) => row.is_active !== false);
        const current = activeRows.find((row) => isDateInsideSeason(row, now));
        return current ? mapSeasonRow(current) : null;
    },
};
