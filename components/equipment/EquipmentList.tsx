"use client";

import { useState, useMemo } from "react";
import { useAppStore } from "@/lib/store";
import { useApi } from "@/hooks/useApi";
import { calcWork, fmtKRW, daysUntil } from "@/lib/utils";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { StatCard } from "@/components/ui/StatCard";
import { ConfirmModal } from "@/components/ui/Modal";
import { EquipmentModal } from "./EquipmentModal";
import { AlertTriangle, Wrench, ChevronDown, ChevronUp } from "lucide-react";
import type { Equipment, EquipmentType } from "@/types";

type TypeFilter = EquipmentType | null;

export function EquipmentList() {
  const { equipments, works, removeEquipment, showToast } = useAppStore();
  const { apiFetch } = useApi();

  const [typeFilter, setTypeFilter] = useState<TypeFilter>(null);
  const [modalOpen, setModalOpen]   = useState(false);
  const [editId, setEditId]         = useState<number | null>(null);
  const [delTarget, setDelTarget]   = useState<Equipment | null>(null);
  const [delLoading, setDelLoading] = useState(false);
  const [expandedCost, setExpandedCost] = useState<number | null>(null); // equipment id

  const now = new Date();

  const filtered = useMemo(() =>
    typeFilter ? equipments.filter((e) => e.type === typeFilter) : equipments,
    [equipments, typeFilter]
  );

  const stats = useMemo(() => {
    const totalMaint = equipments.reduce((s, e) => s + e.maintLogs.reduce((a, l) => a + Number(l.cost || 0), 0), 0);
    const monthFuel  = works.filter((w) => { const d = new Date(w.date+"T00:00:00"); return d.getMonth()===now.getMonth()&&d.getFullYear()===now.getFullYear(); }).reduce((s,w) => s + Number(w.fuel||0), 0);
    const warnCount  = equipments.filter((e) => { const d = daysUntil(e.maintNext); return d !== null && d <= 30; }).length;
    const insWarn    = equipments.filter((e) => { const d = daysUntil(e.insExpiry); return d !== null && d <= 30; }).length;
    return { totalMaint, monthFuel, warnCount, insWarn };
  }, [equipments, works]);

  function openNew()            { setEditId(null); setModalOpen(true); }
  function openEdit(id: number) { setEditId(id);   setModalOpen(true); }

  async function confirmDelete() {
    if (!delTarget) return;
    setDelLoading(true);
    const res = await apiFetch(`/api/equipments/${delTarget.id}`, { method: "DELETE" });
    setDelLoading(false);
    if (!res.ok) return;
    removeEquipment(delTarget.id);
    showToast("삭제되었습니다");
    setDelTarget(null);
  }

  // Build cost history for an equipment: maint logs + monthly fixed grouped by year/month
  function getCostHistory(e: Equipment) {
    // All maint log entries
    const entries: { date: string; ym: string; label: string; amount: number; category: "maint" | "ins" | "fixed" }[] = [];

    e.maintLogs.forEach((l) => {
      if (l.cost > 0) entries.push({ date: l.date, ym: l.date.slice(0,7), label: l.type, amount: l.cost, category: "maint" });
    });

    // Insurance: annual, distribute across months if insExpiry is set
    if (e.insFee > 0 && e.insExpiry) {
      const expYear = e.insExpiry.slice(0,4);
      entries.push({ date: e.insExpiry, ym: e.insExpiry.slice(0,7), label: `보험료 (${e.insurer || "보험"})`, amount: e.insFee, category: "ins" });
    }

    // Group by year/month
    const byYM: Record<string, typeof entries> = {};
    entries.forEach((en) => {
      if (!byYM[en.ym]) byYM[en.ym] = [];
      byYM[en.ym].push(en);
    });

    return byYM;
  }

  const TYPE_FILTERS: { key: TypeFilter; label: string }[] = [
    { key: null, label: "전체" }, { key: "굴삭기", label: "굴삭기" },
    { key: "로더", label: "로더" }, { key: "불도저", label: "불도저" },
    { key: "크레인", label: "크레인" }, { key: "덤프트럭", label: "덤프트럭" },
  ];

  return (
    <div>
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-4">
        <StatCard label="총 장비"      value={`${equipments.length}대`} />
        <StatCard label="누적 정비비"  value={fmtKRW(stats.totalMaint)} color="acc" />
        <StatCard label="이번달 유류비" value={fmtKRW(stats.monthFuel)} color="blu" />
        <StatCard label="점검 임박"    value={`${stats.warnCount}대`}   color={stats.warnCount > 0 ? "red" : "grn"} />
      </div>

      {/* Filter + Add */}
      <div className="flex gap-1.5 mb-4 flex-wrap items-center">
        {TYPE_FILTERS.map((f) => (
          <Button key={String(f.key)} size="sm" variant={typeFilter === f.key ? "primary" : "ghost"}
            onClick={() => setTypeFilter(f.key)}>{f.label}</Button>
        ))}
        <div className="ml-auto">
          <Button variant="primary" size="sm" onClick={openNew}>+ 장비 등록</Button>
        </div>
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="text-center py-10 text-tx3 text-xs">
          <div className="text-3xl mb-2 opacity-30">🚜</div>등록된 장비가 없습니다
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {filtered.map((e) => {
            const maintDays    = daysUntil(e.maintNext);
            const insDays      = daysUntil(e.insExpiry);
            const inspDays     = daysUntil(e.inspNext);
            const maintTotal   = e.maintLogs.reduce((s, l) => s + Number(l.cost || 0), 0);
            const monthlyFixed = Number(e.lease||0) + Number(e.parking||0) + Number(e.fixedOther||0);
            const eqWorks      = works.filter((w) => w.equipmentId === e.id);
            const eqRevenue    = eqWorks.reduce((s, w) => s + calcWork(w), 0);
            const isExpanded   = expandedCost === e.id;
            const costHistory  = getCostHistory(e);
            const sortedYMs    = Object.keys(costHistory).sort().reverse();

            return (
              <div key={e.id} className="bg-s2 border border-bd rounded-lg p-4 hover:border-bd2 transition-colors">
                {/* Header */}
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-[13px]">🚜 {e.name}</span>
                    <Badge variant="type">{e.type}</Badge>
                    {e.regno && <span className="text-[10px] text-tx3">{e.regno}</span>}
                  </div>
                  <div className="flex gap-1.5 flex-shrink-0">
                    <Button size="sm" variant="ghost" onClick={() => openEdit(e.id)}>수정</Button>
                    <Button size="sm" variant="danger" onClick={() => setDelTarget(e)}>삭제</Button>
                  </div>
                </div>

                {/* Meta */}
                <div className="flex flex-wrap gap-x-4 gap-y-1 mb-3">
                  {e.model    && <span className="text-[11px] text-tx2">📦 {e.model} / {e.year}년식</span>}
                  {e.operator && <span className="text-[11px] text-tx2">👤 {e.operator}</span>}
                  {e.rate     > 0 && <span className="text-[11px] text-tx2">💰 {fmtKRW(e.rate)}/h</span>}
                  {e.baseFuel > 0 && <span className="text-[11px] text-tx2">⛽ {fmtKRW(e.baseFuel)}/일</span>}
                </div>

                {/* Detail grid */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-3">
                  {e.insurer && (
                    <div className="bg-s3 rounded-sm p-2.5">
                      <div className="text-[9px] font-bold text-tx3 uppercase tracking-wider mb-1.5">🛡 자동차보험</div>
                      <div className="text-[11px] text-tx2">{e.insurer}</div>
                      <div className="text-[11px] text-tx2">만료: {e.insExpiry} {insDays !== null ? `(${insDays}일 후)` : ""}</div>
                      <div className="text-[11px] text-tx2">{fmtKRW(e.insFee)}/년</div>
                      {insDays !== null && insDays <= 30 && (
                        <div className={`flex items-center gap-1 mt-1.5 text-[10px] ${insDays <= 7 ? "text-red" : "text-orn"}`}>
                          <AlertTriangle size={10} /> 보험 {insDays > 0 ? `${insDays}일 후 만료` : "만료됨"}!
                        </div>
                      )}
                    </div>
                  )}
                  {e.inspNext && (
                    <div className="bg-s3 rounded-sm p-2.5">
                      <div className="text-[9px] font-bold text-tx3 uppercase tracking-wider mb-1.5">🔍 정기검사</div>
                      {e.inspLast && <div className="text-[11px] text-tx2">마지막: {e.inspLast}</div>}
                      <div className="text-[11px] text-tx2">다음: {e.inspNext} {inspDays !== null ? `(${inspDays}일 후)` : ""}</div>
                      {inspDays !== null && inspDays <= 30 && (
                        <div className="flex items-center gap-1 mt-1.5 text-[10px] text-orn">
                          <AlertTriangle size={10} /> 정기검사 임박
                        </div>
                      )}
                    </div>
                  )}
                  <div className="bg-s3 rounded-sm p-2.5">
                    <div className="text-[9px] font-bold text-tx3 uppercase tracking-wider mb-1.5">🔧 정비</div>
                    {e.maintLast && <div className="text-[11px] text-tx2">마지막: {e.maintLast}</div>}
                    {e.maintNext && <div className="text-[11px] text-tx2">예정: {e.maintNext} {maintDays !== null ? `(${maintDays}일 후)` : ""}</div>}
                    <div className="text-[11px] text-tx2">누적: <span className="font-mono text-acc font-bold">{fmtKRW(maintTotal)}</span></div>
                    {maintDays !== null && maintDays <= 30 && (
                      <div className={`flex items-center gap-1 mt-1.5 text-[10px] ${maintDays <= 0 ? "text-red" : "text-orn"}`}>
                        <Wrench size={10} /> 정비 {maintDays > 0 ? `${maintDays}일 후` : "만료됨"}!
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
                  <div className="flex gap-4 flex-wrap">
                    {monthlyFixed > 0 && <span className="text-[11px] text-tx2">📋 월고정비: {fmtKRW(monthlyFixed)}</span>}
                    <span className="text-[11px] text-tx2">작업 {eqWorks.length}건</span>
                    <span className="text-[11px] text-tx2">누적매출: <span className="font-mono text-acc font-semibold">{fmtKRW(eqRevenue)}</span></span>
                  </div>
                  {e.utilRate > 0 && (
                    <div className="flex items-center gap-2 min-w-[140px]">
                      <span className="text-[9px] text-tx3">가동률 {e.utilRate}%</span>
                      <div className="flex-1 h-1 bg-s4 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${e.utilRate >= 80 ? "bg-grn" : e.utilRate >= 50 ? "bg-acc" : "bg-red"}`}
                          style={{ width: `${e.utilRate}%` }} />
                      </div>
                    </div>
                  )}
                </div>

                {/* Cost history toggle */}
                {(maintTotal > 0 || e.insFee > 0) && (
                  <div>
                    <button
                      onClick={() => setExpandedCost(isExpanded ? null : e.id)}
                      className="w-full flex items-center justify-between text-[10px] text-tx3 hover:text-tx py-1 border-t border-bd mt-1 transition-colors"
                    >
                      <span className="font-semibold uppercase tracking-wider">📊 비용·정비 연월별 내역</span>
                      {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                    </button>

                    {isExpanded && (
                      <div className="mt-2 flex flex-col gap-1.5">
                        {sortedYMs.length === 0 ? (
                          <div className="text-center py-3 text-tx3 text-[11px]">내역이 없습니다</div>
                        ) : sortedYMs.map((ym) => {
                          const entries = costHistory[ym];
                          const total   = entries.reduce((s, en) => s + en.amount, 0);
                          const [y, m]  = ym.split("-");
                          return (
                            <details key={ym} className="bg-s3 border border-bd rounded-sm">
                              <summary className="px-3 py-2 flex items-center justify-between cursor-pointer select-none">
                                <span className="text-[11px] font-semibold text-tx">{y}년 {m}월</span>
                                <div className="flex items-center gap-3">
                                  <span className="text-[10px] text-tx3">{entries.length}건</span>
                                  <span className="font-mono text-[11px] font-bold text-acc">{total.toLocaleString()}원</span>
                                </div>
                              </summary>
                              <div className="border-t border-bd">
                                {entries.map((en, i) => (
                                  <div key={i} className="px-3 py-2 flex items-center justify-between gap-2 border-b border-bd last:border-none">
                                    <div className="flex items-center gap-2">
                                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                                        en.category === "maint" ? "bg-blu/10 text-blu" :
                                        en.category === "ins"   ? "bg-pur/10 text-pur" : "bg-grn/10 text-grn"
                                      }`}>
                                        {en.category === "maint" ? "정비" : en.category === "ins" ? "보험" : "고정"}
                                      </span>
                                      <span className="text-[11px] text-tx2">{en.label}</span>
                                      <span className="text-[10px] text-tx3">{en.date}</span>
                                    </div>
                                    <span className="font-mono text-[11px] font-bold text-acc flex-shrink-0">{en.amount.toLocaleString()}원</span>
                                  </div>
                                ))}
                              </div>
                            </details>
                          );
                        })}
                        {/* Monthly fixed cost note */}
                        {monthlyFixed > 0 && (
                          <div className="text-[10px] text-tx3 px-1">
                            * 월 고정비 {fmtKRW(monthlyFixed)} (할부·주차·기타) — 정비 이력에 추가하면 월별로 표시됩니다
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <EquipmentModal open={modalOpen} editId={editId} onClose={() => setModalOpen(false)} />
      <ConfirmModal
        open={!!delTarget}
        description={`"${delTarget?.name}" 장비를 삭제하시겠습니까? 작업 기록이 있으면 삭제할 수 없습니다.`}
        onConfirm={confirmDelete}
        onClose={() => setDelTarget(null)}
        loading={delLoading}
      />
    </div>
  );
}
