"use client";

import { useState, useMemo } from "react";
import { useAppStore } from "@/lib/store";
import { useApi } from "@/hooks/useApi";
import { calcWork, fmtKRW, fmtNum, parseDate } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { ConfirmModal } from "@/components/ui/Modal";
import { StatCard } from "@/components/ui/StatCard";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import type { Work } from "@/types";

type QuickFilter = "all" | "today" | "week" | "month";

const currentYear = new Date().getFullYear();
const YEAR_OPTS  = Array.from({ length: 5 }, (_, i) => ({ value: currentYear - i, label: `${currentYear - i}년` }));
const MONTH_OPTS = Array.from({ length: 12 }, (_, i) => ({ value: i + 1, label: `${i + 1}월` }));

export function WorkList() {
  const { works, companies, equipments, removeWork, showToast } = useAppStore();
  const { apiFetch } = useApi();

  const now = new Date();
  const [quickFilter, setQuickFilter] = useState<QuickFilter>("month");
  const [viewMode, setViewMode]       = useState<"quick" | "monthly" | "daily">("quick");
  const [selYear, setSelYear]         = useState(now.getFullYear());
  const [selMonth, setSelMonth]       = useState(now.getMonth() + 1);
  const [selDate, setSelDate]         = useState(now.toISOString().slice(0, 10));

  const [delTarget, setDelTarget]   = useState<Work | null>(null);
  const [delLoading, setDelLoading] = useState(false);
  const [detailWork, setDetailWork] = useState<Work | null>(null);

  // ── Filtered works ──────────────────────────────────────
  const filtered = useMemo(() => {
    if (viewMode === "monthly") {
      return works.filter((w) => {
        const d = parseDate(w.date);
        return d.getFullYear() === selYear && d.getMonth() + 1 === selMonth;
      });
    }
    if (viewMode === "daily") {
      return works.filter((w) => w.date === selDate);
    }
    // quick
    return works.filter((w) => {
      const d = parseDate(w.date);
      if (quickFilter === "today") return d.toDateString() === now.toDateString();
      if (quickFilter === "week") {
        const ws = new Date(now); ws.setDate(now.getDate() - now.getDay()); ws.setHours(0,0,0,0);
        const we = new Date(ws); we.setDate(ws.getDate() + 6); we.setHours(23,59,59,999);
        return d >= ws && d <= we;
      }
      if (quickFilter === "month") return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      return true;
    });
  }, [works, quickFilter, viewMode, selYear, selMonth, selDate]);

  const monthWorks = useMemo(() =>
    works.filter((w) => { const d = parseDate(w.date); return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear(); }),
    [works]
  );

  const stats = useMemo(() => ({
    filteredTotal: filtered.reduce((s, w) => s + calcWork(w), 0),
    monthTotal:    monthWorks.reduce((s, w) => s + calcWork(w), 0),
  }), [filtered, monthWorks]);

  // ── Daily breakdown (for monthly view) ──────────────────
  const dailyGroups = useMemo(() => {
    if (viewMode !== "monthly") return null;
    const groups: Record<string, Work[]> = {};
    for (const w of filtered) {
      if (!groups[w.date]) groups[w.date] = [];
      groups[w.date].push(w);
    }
    return Object.entries(groups).sort(([a], [b]) => b.localeCompare(a));
  }, [filtered, viewMode]);

  async function confirmDelete() {
    if (!delTarget) return;
    setDelLoading(true);
    const res = await apiFetch(`/api/works/${delTarget.id}`, { method: "DELETE" });
    setDelLoading(false);
    if (!res.ok) return;
    removeWork(delTarget.id);
    showToast("삭제되었습니다");
    setDelTarget(null);
  }

  const QUICK_FILTERS: { key: QuickFilter; label: string }[] = [
    { key: "all",   label: "전체" },
    { key: "today", label: "오늘" },
    { key: "week",  label: "이번주" },
    { key: "month", label: "이번달" },
  ];

  function WorkCard({ w }: { w: Work }) {
    const co  = companies.find((c) => c.id === w.companyId);
    const eq  = equipments.find((e) => e.id === w.equipmentId);
    const otr = Number(w.otr) || Number(w.rate) * 1.5;
    const total = calcWork(w);
    return (
      <div className="bg-s2 border border-bd rounded-lg p-3 hover:border-bd2 transition-colors">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex items-center gap-2 flex-wrap font-bold text-[13px]">
            <span>📅 {w.date}</span>
            {w.note && <span className="text-[10px] font-normal text-tx3">{w.note}</span>}
          </div>
          <div className="flex gap-1.5 flex-shrink-0">
            <Button size="sm" variant="ghost" onClick={() => setDetailWork(w)} className="flex-1 sm:flex-none">상세</Button>
            <Button size="sm" variant="danger" onClick={() => setDelTarget(w)} className="flex-1 sm:flex-none">삭제</Button>
          </div>
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-1 mb-2.5">
          <span className="text-[11px] text-tx2">🏢 {co?.name ?? "(삭제)"}</span>
          <span className="text-[11px] text-tx2">🚜 {eq?.name ?? "(삭제)"}</span>
          <span className="text-[11px] text-tx2">⏱ {w.hours}h{Number(w.ohours) > 0 ? ` + ${w.ohours}h 초과` : ""}</span>
          {Number(w.fuel) > 0 && <span className="text-[11px] text-tx2">⛽ {fmtKRW(w.fuel)}</span>}
        </div>
        <div className="flex items-end justify-between">
          <div className="font-mono text-[10px] text-tx3 leading-relaxed">
            {w.hours}h × {fmtNum(w.rate)}원
            {Number(w.ohours) > 0 ? ` + ${w.ohours}h × ${fmtNum(otr)}원` : ""}
            {Number(w.fuel)  > 0 ? ` + 유류 ${fmtNum(w.fuel)}원`  : ""}
            {Number(w.extra) > 0 ? ` + 추가 ${fmtNum(w.extra)}원` : ""}
          </div>
          <div className="font-mono font-bold text-acc text-[15px]">{fmtKRW(total)}</div>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-4">
        <StatCard label="전체 작업"   value={`${works.length}건`} />
        <StatCard label="이번달 작업" value={`${monthWorks.length}건`} />
        <StatCard label="이번달 매출" value={fmtKRW(stats.monthTotal)}    color="acc" />
        <StatCard label="표시 합계"   value={fmtKRW(stats.filteredTotal)} color="grn" />
      </div>

      {/* View mode tabs */}
      <div className="flex gap-1.5 mb-3 flex-wrap items-center">
        {(["quick", "monthly", "daily"] as const).map((m) => (
          <Button key={m} size="sm" variant={viewMode === m ? "primary" : "ghost"}
            onClick={() => setViewMode(m)}>
            {m === "quick" ? "빠른 필터" : m === "monthly" ? "월별 내역" : "일별 내역"}
          </Button>
        ))}
      </div>

      {/* Filter controls */}
      {viewMode === "quick" && (
        <div className="flex gap-1.5 mb-3 flex-wrap items-center">
          {QUICK_FILTERS.map((f) => (
            <Button key={f.key} size="sm" variant={quickFilter === f.key ? "blue" : "ghost"}
              onClick={() => setQuickFilter(f.key)}>{f.label}</Button>
          ))}
          <span className="ml-auto text-[11px] text-tx3">{filtered.length}건 표시</span>
        </div>
      )}

      {viewMode === "monthly" && (
        <div className="flex gap-2 mb-3 items-end flex-wrap">
          <Select label="연도" options={YEAR_OPTS} value={selYear}
            onChange={(e) => setSelYear(Number(e.target.value))} />
          <Select label="월" options={MONTH_OPTS} value={selMonth}
            onChange={(e) => setSelMonth(Number(e.target.value))} />
          <span className="text-[11px] text-tx3 pb-2.5 ml-auto">{filtered.length}건 / 합계 {fmtKRW(stats.filteredTotal)}</span>
        </div>
      )}

      {viewMode === "daily" && (
        <div className="flex gap-2 mb-3 items-end">
          <Input label="날짜" type="date" value={selDate}
            onChange={(e) => setSelDate(e.target.value)} />
          <span className="text-[11px] text-tx3 pb-2.5">{filtered.length}건 / 합계 {fmtKRW(stats.filteredTotal)}</span>
        </div>
      )}

      {/* Monthly view — grouped by day */}
      {viewMode === "monthly" && dailyGroups && (
        dailyGroups.length === 0
          ? <div className="text-center py-10 text-tx3 text-xs"><div className="text-3xl mb-2 opacity-30">📋</div>해당 월 작업 내역이 없습니다</div>
          : <div className="flex flex-col gap-4">
              {dailyGroups.map(([date, dayWorks]) => {
                const dayTotal = dayWorks.reduce((s, w) => s + calcWork(w), 0);
                return (
                  <div key={date}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-xs font-bold text-tx2 border-b border-bd pb-1 flex-1">
                        📅 {date} ({dayWorks.length}건)
                      </div>
                      <span className="text-xs font-mono font-bold text-acc ml-3">{fmtKRW(dayTotal)}</span>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      {dayWorks.map((w) => <WorkCard key={w.id} w={w} />)}
                    </div>
                  </div>
                );
              })}
              <div className="bg-s3 border border-bd rounded-lg p-3 flex justify-between items-center">
                <span className="text-xs font-bold text-tx2">월 합계</span>
                <span className="font-mono font-bold text-acc text-base">{fmtKRW(stats.filteredTotal)}</span>
              </div>
            </div>
      )}

      {/* Quick / Daily list */}
      {(viewMode === "quick" || viewMode === "daily") && (
        filtered.length === 0
          ? <div className="text-center py-10 text-tx3 text-xs">
              <div className="text-3xl mb-2 opacity-30">📋</div>해당 기간 작업 내역이 없습니다
            </div>
          : <div className="flex flex-col gap-2">
              {filtered.map((w) => <WorkCard key={w.id} w={w} />)}
              {filtered.length > 1 && (
                <div className="bg-s3 border border-bd rounded-lg p-3 flex justify-between items-center">
                  <span className="text-xs font-bold text-tx2">합계 ({filtered.length}건)</span>
                  <span className="font-mono font-bold text-acc text-base">{fmtKRW(stats.filteredTotal)}</span>
                </div>
              )}
            </div>
      )}

      {/* Work detail modal */}
      {detailWork && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75" onClick={() => setDetailWork(null)}>
          <div className="bg-s1 border border-bd rounded-md p-6 w-96 max-w-full animate-fade-in" onClick={(e) => e.stopPropagation()}>
            <div className="font-bold text-sm mb-4">📋 작업 상세</div>
            <table className="w-full text-xs">
              <tbody>
                {[
                  ["날짜", detailWork.date],
                  ["업체", companies.find((c) => c.id === detailWork.companyId)?.name ?? "-"],
                  ["장비", equipments.find((e) => e.id === detailWork.equipmentId)?.name ?? "-"],
                  ["기본시간", `${detailWork.hours}h`],
                  ["초과시간", `${detailWork.ohours}h`],
                  ["기본단가", fmtKRW(detailWork.rate)],
                  ["초과단가", fmtKRW(Number(detailWork.otr) || Number(detailWork.rate) * 1.5)],
                  ["유류비", fmtKRW(detailWork.fuel)],
                  ["추가비용", fmtKRW(detailWork.extra)],
                  ["메모", detailWork.note || "-"],
                ].map(([k, v]) => (
                  <tr key={k} className="border-b border-bd last:border-none">
                    <td className="py-2 text-tx3 w-20">{k}</td>
                    <td className="py-2 text-tx">{v}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {/* Calculation breakdown */}
            <div className="bg-s3 rounded p-3 mt-3">
              <div className="text-[9px] text-tx3 uppercase tracking-wider mb-2">계산 내역</div>
              {(() => {
                const w = detailWork;
                const r = Number(w.rate) || 0;
                const otr = Number(w.otr) || r * 1.5;
                const base = Number(w.hours) * r;
                const over = Number(w.ohours) * otr;
                const fuel = Number(w.fuel) || 0;
                const extra = Number(w.extra) || 0;
                const total = base + over + fuel + extra;
                return (
                  <div className="space-y-1 font-mono text-[10px]">
                    {base > 0 && <div className="flex justify-between"><span className="text-tx3">기본: {w.hours}h × {fmtNum(r)}원</span><span className="text-tx2">{fmtNum(base)}원</span></div>}
                    {over > 0 && <div className="flex justify-between"><span className="text-tx3">초과: {w.ohours}h × {fmtNum(otr)}원</span><span className="text-tx2">{fmtNum(over)}원</span></div>}
                    {fuel > 0 && <div className="flex justify-between"><span className="text-tx3">유류비</span><span className="text-tx2">{fmtNum(fuel)}원</span></div>}
                    {extra > 0 && <div className="flex justify-between"><span className="text-tx3">추가비용</span><span className="text-tx2">{fmtNum(extra)}원</span></div>}
                    <div className="flex justify-between border-t border-bd pt-1 mt-1">
                      <span className="font-bold text-tx2">청구금액</span>
                      <span className="font-bold text-acc">{fmtNum(total)}원</span>
                    </div>
                  </div>
                );
              })()}
            </div>
            <div className="mt-4 flex justify-end">
              <Button variant="ghost" onClick={() => setDetailWork(null)}>닫기</Button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      <ConfirmModal
        open={!!delTarget}
        description={`"${delTarget?.date}" 작업 기록을 삭제하시겠습니까?`}
        onConfirm={confirmDelete}
        onClose={() => setDelTarget(null)}
        loading={delLoading}
      />
    </div>
  );
}
