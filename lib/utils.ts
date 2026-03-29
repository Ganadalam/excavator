import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { Work, ChartBar, ReportFilter } from "@/types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ── Money formatting ───────────────────────────────────────

export function fmtKRW(n: number | string): string {
  return Number(n || 0).toLocaleString("ko-KR") + "원";
}

export function fmtNum(n: number | string): string {
  return Number(n || 0).toLocaleString("ko-KR");
}

// ── Work cost calculation ──────────────────────────────────

export function calcWork(w: Work): number {
  const h    = Number(w.hours)  || 0;
  const oh   = Number(w.ohours) || 0;
  const r    = Number(w.rate)   || 0;
  const otr  = Number(w.otr)    || r * 1.5;
  const fuel = Number(w.fuel)   || 0;
  const ex   = Number(w.extra)  || 0;
  return h * r + oh * otr + fuel + ex;
}

// ── Date helpers ───────────────────────────────────────────

export function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export function todayYMD(): string {
  return today(); // YYYY-MM-DD
}

export function parseDate(ds: string): Date {
  return new Date(ds + "T00:00:00");
}

export function daysUntil(dateStr: string): number | null {
  if (!dateStr) return null;
  return Math.ceil((parseDate(dateStr).getTime() - Date.now()) / 86_400_000);
}

// ── Report helpers ─────────────────────────────────────────

export function getReportRange(filter: ReportFilter): { start: Date; end: Date; label: string } {
  const { type, year, month, from, to } = filter;
  const now = new Date();

  if (type === "month") {
    return {
      start: new Date(year, month - 1, 1),
      end:   new Date(year, month, 0, 23, 59, 59),
      label: `${year}년 ${month}월`,
    };
  }
  if (type === "week") {
    const s = new Date(now);
    s.setDate(now.getDate() - 27);
    s.setHours(0, 0, 0, 0);
    return { start: s, end: now, label: "최근 4주" };
  }
  if (type === "year") {
    return {
      start: new Date(year, 0, 1),
      end:   new Date(year, 11, 31, 23, 59, 59),
      label: `${year}년`,
    };
  }
  return {
    start: from ? parseDate(from) : new Date(0),
    end:   to ? new Date(to + "T23:59:59") : now,
    label: `${from ?? "전체"} ~ ${to ?? "오늘"}`,
  };
}

export function filterWorksByRange(works: Work[], start: Date, end: Date): Work[] {
  return works.filter((w) => {
    const d = parseDate(w.date);
    return d >= start && d <= end;
  });
}

export function buildChartBars(
  type: ReportFilter["type"],
  start: Date,
  end: Date,
  works: Work[]
): ChartBar[] {
  const todayStr = today();
  const bars: ChartBar[] = [];

  if (type === "month" || type === "custom") {
    const cur = new Date(start);
    while (cur <= end && bars.length < 31) {
      const ds = cur.toISOString().slice(0, 10);
      bars.push({
        label:   `${cur.getDate()}일`,
        amount:  works.filter((w) => w.date === ds).reduce((s, w) => s + calcWork(w), 0),
        isToday: ds === todayStr,
      });
      cur.setDate(cur.getDate() + 1);
    }
  } else if (type === "week") {
    for (let i = 3; i >= 0; i--) {
      const ws = new Date();
      ws.setDate(ws.getDate() - ws.getDay() - i * 7);
      ws.setHours(0, 0, 0, 0);
      const we = new Date(ws);
      we.setDate(ws.getDate() + 6);
      we.setHours(23, 59, 59, 999);
      bars.push({
        label:   `${ws.getMonth() + 1}/${ws.getDate()}`,
        amount:  works.filter((w) => { const d = parseDate(w.date); return d >= ws && d <= we; }).reduce((s, w) => s + calcWork(w), 0),
        isToday: i === 0,
      });
    }
  } else {
    for (let m = 1; m <= 12; m++) {
      bars.push({
        label:   `${m}월`,
        amount:  works.filter((w) => parseDate(w.date).getMonth() === m - 1).reduce((s, w) => s + calcWork(w), 0),
        isToday: m === new Date().getMonth() + 1,
      });
    }
  }

  return bars;
}
