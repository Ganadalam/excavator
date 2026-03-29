"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, Database, RefreshCw, Download } from "lucide-react";

interface BackupData {
  _backedUpAt: string;
  users: { id: string; username: string; name: string; role: string }[];
  companies: { id: number; userId: string; name: string; manager: string; contact: string }[];
  equipments: { id: number; userId: string; name: string; type: string; model: string }[];
  works: { id: number; userId: string; date: string; companyId: number; equipmentId: number;
    rate: number; otr: number; hours: number; ohours: number; fuel: number; extra: number; note: string }[];
  maintLogs: { id: number; equipmentId: number; date: string; type: string; cost: number; shop: string }[];
}

function calcWork(w: BackupData["works"][0]) {
  const otr = Number(w.otr) || Number(w.rate) * 1.5;
  return Number(w.hours) * Number(w.rate) + Number(w.ohours) * otr + Number(w.fuel) + Number(w.extra);
}

function fmtKRW(n: number) { return n.toLocaleString("ko-KR") + "원"; }

export default function EmergencyPage() {
  const [data, setData]     = useState<BackupData | null>(null);
  const [error, setError]   = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [tab, setTab]       = useState<"works" | "equipments" | "companies" | "summary">("summary");

  async function load() {
    setLoading(true); setError("");
    try {
      const res  = await fetch("/api/emergency", { credentials: "same-origin" });
      const json = await res.json();
      if (!json.ok) { setError(json.error); setData(null); }
      else setData(json.data);
    } catch {
      setError("네트워크 오류");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  function downloadJSON() {
    if (!data) return;
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
    a.download = `exmgmt-backup-${new Date().toISOString().slice(0,10)}.json`; a.click();
  }

  const TABS = [
    { key: "summary",    label: "요약" },
    { key: "works",      label: `작업 (${data?.works.length ?? 0})` },
    { key: "equipments", label: `장비 (${data?.equipments.length ?? 0})` },
    { key: "companies",  label: `업체 (${data?.companies.length ?? 0})` },
  ] as const;

  return (
    <div className="min-h-screen bg-bg text-tx p-5">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-start justify-between mb-5">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle size={18} className="text-orn" />
              <h1 className="text-base font-bold text-orn">비상 데이터 조회</h1>
            </div>
            <p className="text-[11px] text-tx3">DB 장애 시 최종 백업 데이터를 읽기 전용으로 조회합니다.</p>
            {data?._backedUpAt && (
              <p className="text-[10px] text-tx3 mt-1">
                마지막 백업: <span className="font-mono text-tx2">{new Date(data._backedUpAt).toLocaleString("ko-KR")}</span>
              </p>
            )}
          </div>
          <div className="flex gap-2">
            <button onClick={load} className="flex items-center gap-1.5 text-[11px] px-3 py-1.5 bg-s2 border border-bd rounded hover:bg-s3 transition-colors">
              <RefreshCw size={11} /> 새로고침
            </button>
            {data && (
              <button onClick={downloadJSON} className="flex items-center gap-1.5 text-[11px] px-3 py-1.5 bg-grn/10 border border-grn/25 text-grn rounded hover:bg-grn hover:text-black transition-colors">
                <Download size={11} /> JSON 다운로드
              </button>
            )}
          </div>
        </div>

        {loading && (
          <div className="text-center py-20 text-tx3 text-sm">불러오는 중...</div>
        )}

        {!loading && error && (
          <div className="bg-red/10 border border-red/25 rounded-lg p-6 text-center">
            <Database size={32} className="mx-auto mb-3 text-red opacity-50" />
            <div className="text-sm font-semibold text-red mb-1">{error}</div>
            <div className="text-[11px] text-tx3">데이터가 수정된 적 없거나 백업이 아직 생성되지 않았습니다.</div>
          </div>
        )}

        {!loading && data && (
          <>
            {/* Tabs */}
            <div className="flex gap-1 mb-4 flex-wrap">
              {TABS.map((t) => (
                <button key={t.key} onClick={() => setTab(t.key as typeof tab)}
                  className={`px-3.5 py-1.5 rounded-sm text-xs font-medium transition-all ${
                    tab === t.key ? "bg-orn/15 text-orn border border-orn/25" : "bg-s2 text-tx2 border border-bd hover:bg-s3"
                  }`}>
                  {t.label}
                </button>
              ))}
            </div>

            {/* Summary */}
            {tab === "summary" && (
              <div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-4">
                  {[
                    { label: "회원", value: `${data.users.length}명` },
                    { label: "작업", value: `${data.works.length}건` },
                    { label: "장비", value: `${data.equipments.length}대` },
                    { label: "업체", value: `${data.companies.length}개` },
                  ].map((s) => (
                    <div key={s.label} className="bg-s1 border border-bd rounded-lg px-4 py-3.5">
                      <div className="text-[9px] text-tx3 uppercase tracking-wider mb-1.5">{s.label}</div>
                      <div className="font-mono text-base font-bold text-tx">{s.value}</div>
                    </div>
                  ))}
                </div>
                {/* Total revenue */}
                <div className="bg-s1 border border-bd rounded-lg px-4 py-3.5 mb-4">
                  <div className="text-[9px] text-tx3 uppercase tracking-wider mb-1.5">총 누적 매출</div>
                  <div className="font-mono text-xl font-bold text-acc">
                    {fmtKRW(data.works.reduce((s, w) => s + calcWork(w), 0))}
                  </div>
                </div>
                {/* Users list */}
                <div className="bg-s1 border border-bd rounded-lg overflow-hidden">
                  <div className="px-4 py-2.5 border-b border-bd text-[10px] font-bold text-tx3 uppercase tracking-widest">회원 목록</div>
                  <table className="w-full text-xs">
                    <thead><tr className="border-b border-bd bg-s2">
                      {["이름","아이디","역할"].map((h) => <th key={h} className="text-left px-3 py-2 text-[9px] text-tx3 uppercase tracking-wider">{h}</th>)}
                    </tr></thead>
                    <tbody>
                      {data.users.map((u) => (
                        <tr key={u.id} className="border-b border-bd last:border-none hover:bg-s2">
                          <td className="px-3 py-2 font-semibold">{u.name}</td>
                          <td className="px-3 py-2 font-mono text-tx2">{u.username}</td>
                          <td className="px-3 py-2">
                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${u.role === "admin" ? "bg-pur/15 text-pur" : "bg-s3 text-tx3"}`}>
                              {u.role}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Works */}
            {tab === "works" && (
              <div className="bg-s1 border border-bd rounded-lg overflow-x-auto">
                <table className="w-full text-xs">
                  <thead><tr className="border-b border-bd bg-s2">
                    {["날짜","업체","장비","시간","계산식","청구금액","메모"].map((h) => (
                      <th key={h} className="text-left px-3 py-2 text-[9px] text-tx3 uppercase tracking-wider">{h}</th>
                    ))}
                  </tr></thead>
                  <tbody>
                    {data.works.slice().sort((a,b) => b.date.localeCompare(a.date)).map((w) => {
                      const co   = data.companies.find((c) => c.id === w.companyId);
                      const eq   = data.equipments.find((e) => e.id === w.equipmentId);
                      const otr  = Number(w.otr) || Number(w.rate) * 1.5;
                      const base = Number(w.hours)  * Number(w.rate);
                      const over = Number(w.ohours) * otr;
                      const fuel = Number(w.fuel)   || 0;
                      const extr = Number(w.extra)  || 0;
                      const parts: string[] = [];
                      if (base > 0)  parts.push(`기본 ${w.hours}h × ${Number(w.rate).toLocaleString()} = ${base.toLocaleString()}`);
                      if (over > 0)  parts.push(`초과 ${w.ohours}h × ${otr.toLocaleString()} = ${over.toLocaleString()}`);
                      if (fuel > 0)  parts.push(`유류 ${fuel.toLocaleString()}`);
                      if (extr > 0)  parts.push(`추가 ${extr.toLocaleString()}`);
                      return (
                        <tr key={w.id} className="border-b border-bd last:border-none hover:bg-s2">
                          <td className="px-3 py-2">{w.date}</td>
                          <td className="px-3 py-2">{co?.name ?? "-"}</td>
                          <td className="px-3 py-2">{eq?.name ?? "-"}</td>
                          <td className="px-3 py-2">{w.hours}h{Number(w.ohours)>0?`+${w.ohours}h초과`:""}</td>
                          <td className="px-3 py-2 font-mono text-[10px] text-tx3">{parts.join(" + ") || "-"}</td>
                          <td className="px-3 py-2 font-mono text-right font-bold text-acc">{fmtKRW(calcWork(w))}</td>
                          <td className="px-3 py-2 text-tx3">{w.note || "-"}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Equipments */}
            {tab === "equipments" && (
              <div className="bg-s1 border border-bd rounded-lg overflow-x-auto">
                <table className="w-full text-xs">
                  <thead><tr className="border-b border-bd bg-s2">
                    {["장비명","종류","모델","연식","단가","보험만료","다음정비"].map((h) => (
                      <th key={h} className="text-left px-3 py-2 text-[9px] text-tx3 uppercase tracking-wider">{h}</th>
                    ))}
                  </tr></thead>
                  <tbody>
                    {data.equipments.map((e) => (
                      <tr key={e.id} className="border-b border-bd last:border-none hover:bg-s2">
                        <td className="px-3 py-2 font-semibold">{e.name}</td>
                        <td className="px-3 py-2">{e.type}</td>
                        <td className="px-3 py-2 text-tx2">{e.model || "-"}</td>
                        <td className="px-3 py-2 text-tx2">{(e as any).year}년</td>
                        <td className="px-3 py-2 font-mono">{(e as any).rate>0?fmtKRW((e as any).rate):"-"}</td>
                        <td className="px-3 py-2 text-tx2">{(e as any).insExpiry || "-"}</td>
                        <td className="px-3 py-2 text-tx2">{(e as any).maintNext || "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Companies */}
            {tab === "companies" && (
              <div className="bg-s1 border border-bd rounded-lg overflow-x-auto">
                <table className="w-full text-xs">
                  <thead><tr className="border-b border-bd bg-s2">
                    {["업체명","담당자","연락처","사업자번호","주 계약"].map((h) => (
                      <th key={h} className="text-left px-3 py-2 text-[9px] text-tx3 uppercase tracking-wider">{h}</th>
                    ))}
                  </tr></thead>
                  <tbody>
                    {data.companies.map((c) => (
                      <tr key={c.id} className="border-b border-bd last:border-none hover:bg-s2">
                        <td className="px-3 py-2 font-semibold">{c.name}</td>
                        <td className="px-3 py-2 text-tx2">{c.manager || "-"}</td>
                        <td className="px-3 py-2 text-tx2">{c.contact || "-"}</td>
                        <td className="px-3 py-2 font-mono text-tx2">{(c as any).bizNo || "-"}</td>
                        <td className="px-3 py-2 text-tx2">{(c as any).mainContract || "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
