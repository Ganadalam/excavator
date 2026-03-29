"use client";

import { useState, useMemo } from "react";
import { useAppStore } from "@/lib/store";
import { calcWork, fmtKRW, fmtNum, getReportRange, filterWorksByRange, buildChartBars } from "@/lib/utils";
import { StatCard } from "@/components/ui/StatCard";
import { Tabs } from "@/components/ui/Tabs";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { Input } from "@/components/ui/Input";
import type { ReportFilter } from "@/types";

const PERIOD_TABS = [
  { key: "basic",     label: "작업 내역" },
  { key: "byEquip",   label: "장비별" },
  { key: "byCompany", label: "업체별" },
];

const currentYear = new Date().getFullYear();
const YEAR_OPTS  = Array.from({ length: 5 }, (_, i) => ({ value: currentYear - i, label: `${currentYear - i}년` }));
const MONTH_OPTS = Array.from({ length: 12 }, (_, i) => ({ value: i + 1, label: `${i + 1}월` }));
const TYPE_OPTS  = [
  { value: "month",  label: "월별" },
  { value: "week",   label: "주별 (최근4주)" },
  { value: "year",   label: "연간" },
  { value: "custom", label: "직접 지정" },
];

export function ReportPanel() {
  const { works, companies, equipments } = useAppStore();
  const [tab, setTab] = useState("basic");

  const now = new Date();
  const [filter, setFilter] = useState<ReportFilter>({
    type: "month", year: now.getFullYear(), month: now.getMonth() + 1,
  });

  // Download filters
  const [dlEquipId, setDlEquipId] = useState<string>("");
  const [dlCoId,    setDlCoId]    = useState<string>("");

  const setF = <K extends keyof ReportFilter>(k: K, v: ReportFilter[K]) =>
    setFilter((f) => ({ ...f, [k]: v }));

  const { start, end, label } = useMemo(() => getReportRange(filter), [filter]);
  const rw = useMemo(() => filterWorksByRange(works, start, end), [works, start, end]);

  // Filtered works for filtered-download (same period + optional eq/co)
  const rwFiltered = useMemo(() => {
    let list = rw;
    if (dlEquipId) list = list.filter((w) => w.equipmentId === Number(dlEquipId));
    if (dlCoId)    list = list.filter((w) => w.companyId   === Number(dlCoId));
    return list;
  }, [rw, dlEquipId, dlCoId]);

  const stats = useMemo(() => {
    const total = rwFiltered.reduce((s, w) => s + calcWork(w), 0);
    const fuel  = rwFiltered.reduce((s, w) => s + Number(w.fuel  || 0), 0);
    const extra = rwFiltered.reduce((s, w) => s + Number(w.extra || 0), 0);
    const labor = rwFiltered.reduce((s, w) => s + Number(w.hours||0)*Number(w.rate||0) + Number(w.ohours||0)*(Number(w.otr)||Number(w.rate||0)*1.5), 0);
    const avgRate = rwFiltered.length ? Math.round(rwFiltered.reduce((s, w) => s + Number(w.rate || 0), 0) / rwFiltered.length) : 0;
    return { total, fuel, extra, labor, avgRate };
  }, [rwFiltered]);

  const bars    = useMemo(() => buildChartBars(filter.type, start, end, rw), [filter.type, start, end, rw]);
  const maxAmt  = Math.max(...bars.map((b) => b.amount), 1);

  function buildCSVUrl() {
    const p = new URLSearchParams({
      type: filter.type, year: String(filter.year), month: String(filter.month),
      ...(filter.from ? { from: filter.from } : {}),
      ...(filter.to   ? { to:   filter.to   } : {}),
      ...(dlEquipId   ? { equipmentId: dlEquipId } : {}),
      ...(dlCoId      ? { companyId: dlCoId } : {}),
    });
    return `/api/report/export?${p}`;
  }

  // Build PDF calc detail for each work
  function buildCalcRow(w: (typeof works)[0]) {
    const otr  = Number(w.otr) || Number(w.rate) * 1.5;
    const base = Number(w.hours) * Number(w.rate);
    const over = Number(w.ohours) * otr;
    const fuel = Number(w.fuel) || 0;
    const extra = Number(w.extra) || 0;
    const total = base + over + fuel + extra;
    const parts: string[] = [];
    if (base  > 0) parts.push(`기본 ${w.hours}h × ${Number(w.rate).toLocaleString()} = ${base.toLocaleString()}`);
    if (over  > 0) parts.push(`초과 ${w.ohours}h × ${otr.toLocaleString()} = ${over.toLocaleString()}`);
    if (fuel  > 0) parts.push(`유류${fuel.toLocaleString()}`);
    if (extra > 0) parts.push(`추가${extra.toLocaleString()}`);
    return { base, over, fuel, extra, total, formula: parts.join(" + ") };
  }

  function handlePDF() {
    const targetWorks = rwFiltered;
    const byEq = equipments.map((e) => {
      const ew = targetWorks.filter((w) => w.equipmentId === e.id);
      return ew.length ? { name: e.name, type: e.type, count: ew.length, total: ew.reduce((s,w)=>s+calcWork(w),0), hours: ew.reduce((s,w)=>s+Number(w.hours||0),0) } : null;
    }).filter(Boolean) as { name:string;type:string;count:number;total:number;hours:number }[];
    const byCo = companies.map((c) => {
      const cw = targetWorks.filter((w) => w.companyId === c.id);
      return cw.length ? { name: c.name, count: cw.length, total: cw.reduce((s,w)=>s+calcWork(w),0) } : null;
    }).filter(Boolean) as { name:string;count:number;total:number }[];

    const filterNote = [
      dlEquipId ? `장비: ${equipments.find((e)=>String(e.id)===dlEquipId)?.name ?? dlEquipId}` : "",
      dlCoId    ? `업체: ${companies.find((c)=>String(c.id)===dlCoId)?.name ?? dlCoId}` : "",
    ].filter(Boolean).join(" / ");

    const html = `<!DOCTYPE html><html lang="ko"><head><meta charset="UTF-8"/>
    <style>
      body{font-family:'Noto Sans KR',sans-serif;font-size:12px;color:#1a1a2e;margin:32px;line-height:1.6;}
      h1{font-size:20px;margin-bottom:4px;} .sub{color:#666;font-size:11px;margin-bottom:20px;}
      .sect{margin-bottom:22px;} .sect-title{font-size:13px;font-weight:700;border-bottom:2px solid #1a1a2e;padding-bottom:4px;margin-bottom:10px;}
      .sum{display:flex;gap:14px;flex-wrap:wrap;margin-bottom:16px;}
      .sc{border:1px solid #ddd;border-radius:6px;padding:10px 14px;min-width:110px;}
      .sc-l{font-size:9px;color:#888;text-transform:uppercase;letter-spacing:.06em;}
      .sc-v{font-size:15px;font-weight:700;}
      table{width:100%;border-collapse:collapse;font-size:11px;}
      th{text-align:left;background:#f5f5f5;padding:6px 10px;font-size:10px;letter-spacing:.04em;}
      td{padding:6px 10px;border-bottom:1px solid #eee;} .num{text-align:right;font-weight:600;}
      .formula{font-family:monospace;font-size:9px;color:#888;}
      .total-row{background:#fafafa;font-weight:700;}
      .footer{margin-top:28px;color:#aaa;font-size:10px;border-top:1px solid #eee;padding-top:10px;}
    </style></head><body>
    <h1>🚜 중장비 작업 보고서</h1>
    <div class="sub">기간: ${label}${filterNote ? ` | 필터: ${filterNote}` : ""} | 작성일: ${new Date().toLocaleDateString("ko-KR")}</div>
    <div class="sect"><div class="sect-title">요약</div>
      <div class="sum">
        <div class="sc"><div class="sc-l">총 작업</div><div class="sc-v">${targetWorks.length}건</div></div>
        <div class="sc"><div class="sc-l">총 매출</div><div class="sc-v" style="color:#c88010">${stats.total.toLocaleString()}원</div></div>
        <div class="sc"><div class="sc-l">작업 매출</div><div class="sc-v">${stats.labor.toLocaleString()}원</div></div>
        <div class="sc"><div class="sc-l">유류비</div><div class="sc-v">${stats.fuel.toLocaleString()}원</div></div>
        <div class="sc"><div class="sc-l">추가비용</div><div class="sc-v">${stats.extra.toLocaleString()}원</div></div>
        <div class="sc"><div class="sc-l">평균단가</div><div class="sc-v">${stats.avgRate.toLocaleString()}원</div></div>
      </div>
    </div>
    <div class="sect"><div class="sect-title">작업 내역 (계산 포함)</div>
      <table><thead><tr><th>날짜</th><th>업체</th><th>장비</th><th>기본</th><th>초과</th><th>유류비</th><th>추가</th><th>계산식</th><th class="num">청구금액</th></tr></thead>
      <tbody>${targetWorks.map((w) => {
        const co = companies.find((c) => c.id === w.companyId);
        const eq = equipments.find((e) => e.id === w.equipmentId);
        const { base, over, fuel, extra, total, formula } = buildCalcRow(w);
        return `<tr>
          <td>${w.date}</td><td>${co?.name??"-"}</td><td>${eq?.name??"-"}</td>
          <td>${w.hours}h × ${Number(w.rate).toLocaleString()}</td>
          <td>${Number(w.ohours)>0?`${w.ohours}h × ${(Number(w.otr)||Number(w.rate)*1.5).toLocaleString()}`:"-"}</td>
          <td class="num">${fuel>0?fuel.toLocaleString():"-"}</td>
          <td class="num">${extra>0?extra.toLocaleString():"-"}</td>
          <td class="formula">${formula}</td>
          <td class="num"><b>${total.toLocaleString()}원</b></td>
        </tr>`;
      }).join("")}
      <tr class="total-row">
        <td colspan="8">합계</td>
        <td class="num">${stats.total.toLocaleString()}원</td>
      </tr>
      </tbody></table>
    </div>
    ${byEq.length ? `<div class="sect"><div class="sect-title">장비별 집계</div>
      <table><thead><tr><th>장비</th><th>종류</th><th>작업건수</th><th>총시간</th><th class="num">매출합계</th></tr></thead>
      <tbody>${byEq.map((x)=>`<tr><td>${x.name}</td><td>${x.type}</td><td>${x.count}건</td><td>${x.hours}h</td><td class="num">${x.total.toLocaleString()}원</td></tr>`).join("")}</tbody></table></div>` : ""}
    ${byCo.length ? `<div class="sect"><div class="sect-title">업체별 집계</div>
      <table><thead><tr><th>업체</th><th>작업건수</th><th class="num">매출합계</th></tr></thead>
      <tbody>${byCo.map((x)=>`<tr><td>${x.name}</td><td>${x.count}건</td><td class="num">${x.total.toLocaleString()}원</td></tr>`).join("")}</tbody></table></div>` : ""}
    <div class="footer">EX-MGMT Pro | 출력: ${new Date().toLocaleString("ko-KR")}</div>
    </body></html>`;

    const win = window.open("", "_blank", "width=1024,height=768");
    if (!win) return;
    win.document.write(html);
    win.document.close();
    setTimeout(() => win.print(), 400);
  }

  const equipOpts = [{ value: "", label: "전체 장비" }, ...equipments.map((e) => ({ value: String(e.id), label: e.name }))];
  const coOpts    = [{ value: "", label: "전체 업체" }, ...companies.map((c) => ({ value: String(c.id), label: c.name }))];

  return (
    <div>
      {/* Period selector */}
      <div className="bg-s1 border border-bd rounded-lg px-4 py-3 mb-4 flex flex-wrap gap-3 items-end">
        <Select label="기간" options={TYPE_OPTS} value={filter.type}
          onChange={(e) => setF("type", e.target.value as ReportFilter["type"])} />
        <Select label="연도" options={YEAR_OPTS} value={filter.year}
          onChange={(e) => setF("year", Number(e.target.value))} />
        {filter.type === "month" && (
          <Select label="월" options={MONTH_OPTS} value={filter.month}
            onChange={(e) => setF("month", Number(e.target.value))} />
        )}
        {filter.type === "custom" && (<>
          <Input label="시작일" type="date" value={filter.from ?? ""} onChange={(e) => setF("from", e.target.value)} />
          <Input label="종료일" type="date" value={filter.to   ?? ""} onChange={(e) => setF("to",   e.target.value)} />
        </>)}
      </div>

      {/* Download filter + buttons */}
      <div className="bg-s1 border border-bd rounded-lg px-4 py-3 mb-4 flex flex-wrap gap-3 items-end">
        <div className="text-[10px] text-tx3 uppercase tracking-wider self-center mr-1">다운로드 필터</div>
        <div className="flex flex-col gap-0.5">
          <label className="text-[9px] text-tx3 uppercase tracking-wider">장비</label>
          <select value={dlEquipId} onChange={(e) => setDlEquipId(e.target.value)}
            className="bg-s2 border border-bd rounded-sm text-tx text-xs px-2 py-1.5 outline-none focus:border-acc">
            {equipOpts.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        <div className="flex flex-col gap-0.5">
          <label className="text-[9px] text-tx3 uppercase tracking-wider">업체</label>
          <select value={dlCoId} onChange={(e) => setDlCoId(e.target.value)}
            className="bg-s2 border border-bd rounded-sm text-tx text-xs px-2 py-1.5 outline-none focus:border-acc">
            {coOpts.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        <div className="flex gap-2 ml-auto items-end">
          <span className="text-[10px] text-tx3 self-center">{rwFiltered.length}건</span>
          <Button variant="green" size="sm" as="a" href={buildCSVUrl()} download>⬇ CSV</Button>
          <Button variant="blue"  size="sm" onClick={handlePDF}>🖨 PDF</Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 mb-4">
        <StatCard label={`${label} 작업`}  value={`${rwFiltered.length}건`} />
        <StatCard label="총 매출"           value={fmtKRW(stats.total)}  color="acc" />
        <StatCard label="작업 매출"         value={fmtKRW(stats.labor)}  color="blu" />
        <StatCard label="유류비 합계"        value={fmtKRW(stats.fuel)} />
        <StatCard label="추가비 합계"        value={fmtKRW(stats.extra)} />
        <StatCard label="평균 단가"          value={fmtKRW(stats.avgRate)} color="grn" />
      </div>

      {/* Bar chart */}
      <div className="bg-s1 border border-bd rounded-lg p-4 mb-4">
        <div className="text-[10px] font-bold text-tx3 uppercase tracking-widest mb-3">📊 기간별 매출 차트</div>
        <div className="h-44 flex items-end gap-1.5 pt-4">
          {bars.map((b, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-1 group">
              <div className="relative w-full">
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 opacity-0 group-hover:opacity-100 transition-opacity
                  bg-s4 border border-bd2 rounded px-1.5 py-0.5 text-[9px] font-mono whitespace-nowrap z-10 pointer-events-none">
                  {b.label}: {fmtNum(b.amount)}원
                </div>
                <div
                  className={`w-full rounded-t transition-all duration-500 min-h-[2px] ${b.isToday ? "bg-grn" : "bg-acc hover:bg-acc2"}`}
                  style={{ height: `${Math.max(4, Math.round((b.amount / maxAmt) * 140))}px` }}
                />
              </div>
              <div className={`text-[9px] ${b.isToday ? "text-grn" : "text-tx3"}`}>{b.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Table tabs */}
      <Tabs tabs={PERIOD_TABS} active={tab} onChange={setTab} />

      <div className="bg-s1 border border-bd rounded-lg overflow-x-auto">
        {tab === "basic" && (
          rwFiltered.length === 0
            ? <div className="text-center py-10 text-tx3 text-xs"><div className="text-3xl mb-2 opacity-30">📋</div>해당 기간 데이터가 없습니다</div>
            : <table className="w-full text-xs">
                <thead>
                  <tr>
                    {["날짜","업체","장비","기본(h)","초과(h)","기본금액","초과금액","유류비","추가비","청구금액"].map((h) => (
                      <th key={h} className="text-left text-[9px] font-bold text-tx3 uppercase tracking-wider px-3 py-2 border-b border-bd">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rwFiltered.map((w) => {
                    const co = companies.find((c) => c.id === w.companyId);
                    const eq = equipments.find((e) => e.id === w.equipmentId);
                    const otr = Number(w.otr) || Number(w.rate) * 1.5;
                    const base = Number(w.hours) * Number(w.rate);
                    const over = Number(w.ohours) * otr;
                    return (
                      <tr key={w.id} className="hover:bg-s2 border-b border-bd last:border-none">
                        <td className="px-3 py-2">{w.date}</td>
                        <td className="px-3 py-2">{co?.name ?? "-"}</td>
                        <td className="px-3 py-2">{eq?.name ?? "-"}</td>
                        <td className="px-3 py-2">{w.hours}h</td>
                        <td className="px-3 py-2">{w.ohours || 0}h</td>
                        <td className="px-3 py-2 font-mono text-right">{fmtNum(base)}원</td>
                        <td className="px-3 py-2 font-mono text-right">{fmtNum(over)}원</td>
                        <td className="px-3 py-2 font-mono text-right">{fmtNum(w.fuel)}</td>
                        <td className="px-3 py-2 font-mono text-right">{fmtNum(w.extra)}</td>
                        <td className="px-3 py-2 font-mono text-right font-bold text-acc">{fmtKRW(calcWork(w))}</td>
                      </tr>
                    );
                  })}
                  <tr className="bg-s3 font-bold border-t border-bd2">
                    <td colSpan={5} className="px-3 py-2">합계</td>
                    <td className="px-3 py-2 font-mono text-right">{fmtNum(rwFiltered.reduce((s,w)=>s+Number(w.hours)*Number(w.rate),0))}원</td>
                    <td className="px-3 py-2 font-mono text-right">{fmtNum(rwFiltered.reduce((s,w)=>s+Number(w.ohours)*(Number(w.otr)||Number(w.rate)*1.5),0))}원</td>
                    <td className="px-3 py-2 font-mono text-right">{fmtNum(rwFiltered.reduce((s,w)=>s+(Number(w.fuel)||0),0))}</td>
                    <td className="px-3 py-2 font-mono text-right">{fmtNum(rwFiltered.reduce((s,w)=>s+(Number(w.extra)||0),0))}</td>
                    <td className="px-3 py-2 font-mono text-right text-acc">{fmtKRW(stats.total)}</td>
                  </tr>
                </tbody>
              </table>
        )}

        {tab === "byEquip" && (() => {
          const rows = equipments.map((e) => {
            const ew = rwFiltered.filter((w) => w.equipmentId === e.id);
            if (!ew.length) return null;
            const base = ew.reduce((s,w)=>s+Number(w.hours)*Number(w.rate),0);
            const over = ew.reduce((s,w)=>s+Number(w.ohours)*(Number(w.otr)||Number(w.rate)*1.5),0);
            return { name:e.name, type:e.type, count:ew.length, total:ew.reduce((s,w)=>s+calcWork(w),0), hours:ew.reduce((s,w)=>s+Number(w.hours||0),0), base, over };
          }).filter(Boolean).sort((a, b) => b!.total - a!.total) as {name:string;type:string;count:number;total:number;hours:number;base:number;over:number}[];
          return rows.length === 0
            ? <div className="text-center py-10 text-tx3 text-xs"><div className="text-3xl mb-2 opacity-30">🚜</div>해당 기간 데이터가 없습니다</div>
            : <table className="w-full text-xs">
                <thead><tr>{["장비","종류","작업건수","총시간","기본금액","초과금액","매출합계"].map((h) => <th key={h} className="text-left text-[9px] font-bold text-tx3 uppercase tracking-wider px-3 py-2 border-b border-bd">{h}</th>)}</tr></thead>
                <tbody>{rows.map((x) => <tr key={x.name} className="hover:bg-s2 border-b border-bd last:border-none">
                  <td className="px-3 py-2">{x.name}</td>
                  <td className="px-3 py-2"><span className="bg-blu/10 text-blu text-[9px] font-bold px-1.5 py-0.5 rounded uppercase">{x.type}</span></td>
                  <td className="px-3 py-2">{x.count}건</td>
                  <td className="px-3 py-2">{x.hours}h</td>
                  <td className="px-3 py-2 font-mono text-right">{fmtNum(x.base)}원</td>
                  <td className="px-3 py-2 font-mono text-right">{fmtNum(x.over)}원</td>
                  <td className="px-3 py-2 font-mono text-right font-bold text-acc">{fmtKRW(x.total)}</td>
                </tr>)}</tbody>
              </table>;
        })()}

        {tab === "byCompany" && (() => {
          const rows = companies.map((c) => {
            const cw = rwFiltered.filter((w) => w.companyId === c.id);
            if (!cw.length) return null;
            const base = cw.reduce((s,w)=>s+Number(w.hours)*Number(w.rate),0);
            const over = cw.reduce((s,w)=>s+Number(w.ohours)*(Number(w.otr)||Number(w.rate)*1.5),0);
            return { name:c.name, manager:c.manager, count:cw.length, total:cw.reduce((s,w)=>s+calcWork(w),0), base, over };
          }).filter(Boolean).sort((a, b) => b!.total - a!.total) as {name:string;manager:string;count:number;total:number;base:number;over:number}[];
          return rows.length === 0
            ? <div className="text-center py-10 text-tx3 text-xs"><div className="text-3xl mb-2 opacity-30">🏢</div>해당 기간 데이터가 없습니다</div>
            : <table className="w-full text-xs">
                <thead><tr>{["업체","담당자","작업건수","기본금액","초과금액","매출합계"].map((h) => <th key={h} className="text-left text-[9px] font-bold text-tx3 uppercase tracking-wider px-3 py-2 border-b border-bd">{h}</th>)}</tr></thead>
                <tbody>{rows.map((x) => <tr key={x.name} className="hover:bg-s2 border-b border-bd last:border-none">
                  <td className="px-3 py-2">{x.name}</td>
                  <td className="px-3 py-2">{x.manager || "-"}</td>
                  <td className="px-3 py-2">{x.count}건</td>
                  <td className="px-3 py-2 font-mono text-right">{fmtNum(x.base)}원</td>
                  <td className="px-3 py-2 font-mono text-right">{fmtNum(x.over)}원</td>
                  <td className="px-3 py-2 font-mono text-right font-bold text-acc">{fmtKRW(x.total)}</td>
                </tr>)}</tbody>
              </table>;
        })()}
      </div>
    </div>
  );
}
