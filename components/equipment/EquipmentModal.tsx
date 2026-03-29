"use client";

import { useState, useEffect } from "react";
import { useAppStore } from "@/lib/store";
import { useApi } from "@/hooks/useApi";
import { today } from "@/lib/utils";
import { Modal } from "@/components/ui/Modal";
import { Tabs } from "@/components/ui/Tabs";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { Button } from "@/components/ui/Button";
import { Trash2 } from "lucide-react";
import type { Equipment, EquipmentType, MaintenanceLog } from "@/types";

const TYPES: EquipmentType[] = ["굴삭기","로더","불도저","크레인","덤프트럭","기타"];
const FUEL_PRESETS: Record<string, number> = { 굴삭기:85000, 로더:70000, 불도저:90000, 크레인:60000, 덤프트럭:100000 };
const PRESET_MODELS: Record<string, string[]> = {
  굴삭기: ["KOMATSU PC60","KOMATSU PC200","HYUNDAI R80","HYUNDAI R140","DOOSAN DX140","CAT 320"],
  로더:   ["KOMATSU WA200","HYUNDAI HL760","CAT 950"],
  불도저: ["KOMATSU D65","CATERPILLAR D6"],
  크레인: ["TADANO GR-300","LIEBHERR LTM1030"],
  덤프트럭: ["HYUNDAI HD170","DAEWOO NOVUS"],
};
const MAINT_TYPES = ["엔진오일 교체","필터 교체","타이어","브레이크","정기점검","부품교체","기타"];
const TABS = [
  { key: "basic", label: "기본정보" },
  { key: "cost",  label: "비용·보험" },
  { key: "maint", label: "정비이력" },
];

// All numeric fields stored as string for clean UX (no sticky 0)
interface FormState {
  name: string; type: EquipmentType | ""; model: string; year: string;
  regno: string; operator: string; rate: string; baseFuel: string; note: string;
  insurer: string; insExpiry: string; insFee: string; inspLast: string; inspNext: string;
  lease: string; parking: string; fixedOther: string;
  maintLast: string; maintNext: string; utilRate: string;
  maintLogs: MaintenanceLog[];
}

function makeEmptyForm(): FormState {
  const t = today();
  return {
    name:"", type:"", model:"", year: String(new Date().getFullYear()),
    regno:"", operator:"", rate:"", baseFuel:"", note:"",
    insurer:"", insExpiry:t, insFee:"", inspLast:t, inspNext:t,
    lease:"", parking:"", fixedOther:"",
    maintLast:t, maintNext:t, utilRate:"",
    maintLogs:[],
  };
}

function equipToForm(eq: Equipment): FormState {
  return {
    name: eq.name, type: eq.type, model: eq.model,
    year: String(eq.year),
    regno: eq.regno, operator: eq.operator,
    rate: eq.rate ? String(eq.rate) : "",
    baseFuel: eq.baseFuel ? String(eq.baseFuel) : "",
    note: eq.note,
    insurer: eq.insurer,
    insExpiry: eq.insExpiry || today(),
    insFee: eq.insFee ? String(eq.insFee) : "",
    inspLast: eq.inspLast || today(),
    inspNext: eq.inspNext || today(),
    lease: eq.lease ? String(eq.lease) : "",
    parking: eq.parking ? String(eq.parking) : "",
    fixedOther: eq.fixedOther ? String(eq.fixedOther) : "",
    maintLast: eq.maintLast || today(),
    maintNext: eq.maintNext || today(),
    utilRate: eq.utilRate ? String(eq.utilRate) : "",
    maintLogs: eq.maintLogs,
  };
}

interface LogForm { date: string; type: string; cost: string; shop: string; note: string; }
function makeEmptyLog(): LogForm { return { date: today(), type:"엔진오일 교체", cost:"", shop:"", note:"" }; }

interface Props { open: boolean; editId: number | null; onClose: () => void; }

export function EquipmentModal({ open, editId, onClose }: Props) {
  const { equipments, addEquipment, updateEquipment, showToast } = useAppStore();
  const { apiFetch } = useApi();

  const [tab, setTab]     = useState("basic");
  const [form, setForm]   = useState<FormState>(makeEmptyForm);
  const [log,  setLog]    = useState<LogForm>(makeEmptyLog);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setTab("basic");
    if (editId) {
      const eq = equipments.find((e) => e.id === editId);
      if (eq) setForm(equipToForm(eq));
    } else {
      setForm(makeEmptyForm());
    }
    setLog(makeEmptyLog());
  }, [open, editId, equipments]);

  const set = (k: keyof FormState, v: string | MaintenanceLog[]) =>
    setForm((f) => ({ ...f, [k]: v }));

  function onTypeChange(type: EquipmentType | "") {
    setForm((f) => ({
      ...f, type: type as EquipmentType,
      baseFuel: type ? String(FUEL_PRESETS[type] ?? (f.baseFuel || "")) : f.baseFuel,
      model: "",
    }));
  }

  function addLog() {
    if (!log.date) return showToast("정비일을 입력하세요","err");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(log.date)) return showToast("날짜 형식이 올바르지 않습니다","err");
    const newLog: MaintenanceLog = {
      id: Date.now(), date: log.date, type: log.type,
      cost: Number(log.cost) || 0, shop: log.shop, note: log.note,
    };
    setForm((f) => ({ ...f, maintLogs: [newLog, ...f.maintLogs] }));
    setLog(makeEmptyLog());
  }

  function removeLog(id: number) {
    setForm((f) => ({ ...f, maintLogs: f.maintLogs.filter((l) => l.id !== id) }));
  }

  const sanitiseDate = (d: string) => /^\d{4}-\d{2}-\d{2}$/.test(d) ? d : "";

  async function handleSave() {
    if (!form.name) return showToast("장비명을 입력하세요","err");
    if (!form.type) return showToast("장비 종류를 선택하세요","err");
    setLoading(true);

    const payload = {
      name: form.name, type: form.type as EquipmentType,
      model: form.model, year: Number(form.year) || new Date().getFullYear(),
      regno: form.regno, operator: form.operator,
      rate: Number(form.rate) || 0, baseFuel: Number(form.baseFuel) || 0,
      insurer: form.insurer,
      insExpiry:  sanitiseDate(form.insExpiry),
      insFee:     Number(form.insFee) || 0,
      inspLast:   sanitiseDate(form.inspLast),
      inspNext:   sanitiseDate(form.inspNext),
      lease:      Number(form.lease) || 0,
      parking:    Number(form.parking) || 0,
      fixedOther: Number(form.fixedOther) || 0,
      maintLast:  sanitiseDate(form.maintLast),
      maintNext:  sanitiseDate(form.maintNext),
      utilRate:   Number(form.utilRate) || 0,
      note: form.note,
      maintLogs: form.maintLogs
        .filter((l) => /^\d{4}-\d{2}-\d{2}$/.test(l.date))
        .map((l) => ({ ...l, cost: Number(l.cost) || 0 })),
    };

    const url    = editId ? `/api/equipments/${editId}` : "/api/equipments";
    const method = editId ? "PUT" : "POST";
    const res = await apiFetch<Equipment>(url, { method, body: JSON.stringify(payload) });
    setLoading(false);
    if (!res.ok) return;
    editId ? updateEquipment(res.data) : addEquipment(res.data);
    showToast(editId ? "장비 정보가 수정되었습니다" : "장비가 등록되었습니다");
    onClose();
  }

  const typeOpts   = TYPES.map((t) => ({ value: t, label: t }));
  const modelOpts  = (PRESET_MODELS[form.type] ?? []).map((m) => ({ value: m, label: m }));
  const maintTotal = form.maintLogs.reduce((s, l) => s + Number(l.cost || 0), 0);

  // Group maintLogs by year/month for history view
  const maintByYearMonth = form.maintLogs.reduce<Record<string, MaintenanceLog[]>>((acc, l) => {
    const ym = l.date.slice(0, 7); // YYYY-MM
    if (!acc[ym]) acc[ym] = [];
    acc[ym].push(l);
    return acc;
  }, {});
  const sortedYMs = Object.keys(maintByYearMonth).sort().reverse();

  return (
    <Modal
      open={open} onClose={onClose} size="lg"
      title={editId ? `장비 수정 — ${form.name}` : "장비 등록"}
      footer={<>
        <Button variant="ghost" onClick={onClose} disabled={loading}>취소</Button>
        <Button variant="primary" onClick={handleSave} loading={loading}>저장</Button>
      </>}
    >
      <Tabs tabs={TABS} active={tab} onChange={setTab} />

      {/* ── 기본정보 ── */}
      {tab === "basic" && (
        <div>
          <div className="grid grid-cols-2 gap-2">
            <Input label="장비명" required value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="포크레인 06" />
            <Select label="장비종류" required options={typeOpts} placeholder="선택" value={form.type}
              onChange={(e) => onTypeChange(e.target.value as EquipmentType)} />
          </div>
          {modelOpts.length > 0 && (
            <Select label="모델 프리셋" options={modelOpts} placeholder="프리셋 선택" value=""
              onChange={(e) => set("model", e.target.value)} />
          )}
          <div className="grid grid-cols-2 gap-2">
            <Input label="모델명" value={form.model} onChange={(e) => set("model", e.target.value)} placeholder="직접 입력" />
            <Input label="연식" type="number" min="1990" max="2040" value={form.year}
              onChange={(e) => set("year", e.target.value)} placeholder={String(new Date().getFullYear())} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Input label="차량번호" value={form.regno} onChange={(e) => set("regno", e.target.value)} placeholder="12가 3456" />
            <Input label="운전원" value={form.operator} onChange={(e) => set("operator", e.target.value)} placeholder="담당자" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Input label="시간단가 (원/h)" type="number" min="0" value={form.rate}
              onChange={(e) => set("rate", e.target.value)} placeholder="0" />
            <Input label="일 유류비 기본값 (원)" type="number" min="0" value={form.baseFuel}
              onChange={(e) => set("baseFuel", e.target.value)} placeholder="0" />
          </div>
          <Textarea label="특이사항" value={form.note} onChange={(e) => set("note", e.target.value)} placeholder="메모" />
        </div>
      )}

      {/* ── 비용·보험 ── */}
      {tab === "cost" && (
        <div>
          <p className="text-[10px] font-bold text-tx3 uppercase tracking-widest mb-2">🛡 자동차보험</p>
          <div className="grid grid-cols-3 gap-2">
            <Input label="보험사" value={form.insurer} onChange={(e) => set("insurer", e.target.value)} placeholder="삼성화재" />
            <Input label="보험만료일" type="date" value={form.insExpiry} onChange={(e) => set("insExpiry", e.target.value)} />
            <Input label="연 보험료 (원)" type="number" min="0" value={form.insFee}
              onChange={(e) => set("insFee", e.target.value)} placeholder="0" />
          </div>
          <p className="text-[10px] font-bold text-tx3 uppercase tracking-widest mb-2 mt-4">🔍 정기검사</p>
          <div className="grid grid-cols-2 gap-2">
            <Input label="마지막 검사일" type="date" value={form.inspLast} onChange={(e) => set("inspLast", e.target.value)} />
            <Input label="다음 검사 예정일" type="date" value={form.inspNext} onChange={(e) => set("inspNext", e.target.value)} />
          </div>
          <p className="text-[10px] font-bold text-tx3 uppercase tracking-widest mb-2 mt-4">📋 월 고정비용</p>
          <div className="grid grid-cols-3 gap-2">
            <Input label="할부·리스 (원)" type="number" min="0" value={form.lease}
              onChange={(e) => set("lease", e.target.value)} placeholder="0" />
            <Input label="주차·보관료 (원)" type="number" min="0" value={form.parking}
              onChange={(e) => set("parking", e.target.value)} placeholder="0" />
            <Input label="기타 고정비 (원)" type="number" min="0" value={form.fixedOther}
              onChange={(e) => set("fixedOther", e.target.value)} placeholder="0" />
          </div>
        </div>
      )}

      {/* ── 정비이력 ── */}
      {tab === "maint" && (
        <div>
          <div className="grid grid-cols-2 gap-2">
            <Input label="마지막 정비일" type="date" value={form.maintLast} onChange={(e) => set("maintLast", e.target.value)} />
            <Input label="다음 정비 예정일" type="date" value={form.maintNext} onChange={(e) => set("maintNext", e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Input label="가동률 (%)" type="number" min="0" max="100" value={form.utilRate}
              onChange={(e) => set("utilRate", e.target.value)} placeholder="0" />
            <div className="mb-2.5">
              <div className="text-[10px] font-semibold text-tx3 uppercase tracking-wider mb-1">누적 정비비</div>
              <div className="bg-s2 border border-bd rounded-sm px-3 py-2 font-mono text-xs text-acc font-bold">
                {maintTotal.toLocaleString("ko-KR")}원
              </div>
            </div>
          </div>

          {/* Add log form */}
          <div className="bg-s3 rounded-sm p-3 mb-3">
            <p className="text-[10px] font-bold text-tx3 uppercase tracking-widest mb-2">+ 정비 이력 추가</p>
            <div className="grid grid-cols-2 gap-2">
              <Input label="정비일" type="date" value={log.date}
                onChange={(e) => setLog((l) => ({...l, date: e.target.value}))} />
              <Select label="정비종류" options={MAINT_TYPES.map((t)=>({value:t,label:t}))} value={log.type}
                onChange={(e) => setLog((l) => ({...l, type: e.target.value}))} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Input label="비용 (원)" type="number" min="0" value={log.cost}
                onChange={(e) => setLog((l) => ({...l, cost: e.target.value}))} placeholder="0" />
              <Input label="정비업체" value={log.shop}
                onChange={(e) => setLog((l) => ({...l, shop: e.target.value}))} placeholder="현대서비스" />
            </div>
            <Input label="메모" value={log.note}
              onChange={(e) => setLog((l) => ({...l, note: e.target.value}))} placeholder="메모" />
            <Button variant="ghost" fullWidth onClick={addLog}>+ 이력 추가</Button>
          </div>

          {/* Monthly grouped log history */}
          {form.maintLogs.length > 0 && (
            <div className="mb-2">
              <div className="text-[9px] font-bold text-tx3 uppercase tracking-widest mb-2">연·월별 정비 내역</div>
              <div className="flex flex-col gap-2">
                {sortedYMs.map((ym) => {
                  const logs  = maintByYearMonth[ym];
                  const total = logs.reduce((s, l) => s + Number(l.cost || 0), 0);
                  const [y, m] = ym.split("-");
                  return (
                    <details key={ym} className="bg-s2 border border-bd rounded-sm">
                      <summary className="px-3 py-2 flex items-center justify-between cursor-pointer select-none">
                        <span className="text-[11px] font-semibold text-tx">{y}년 {m}월</span>
                        <div className="flex items-center gap-3">
                          <span className="text-[10px] text-tx3">{logs.length}건</span>
                          <span className="font-mono text-[11px] font-bold text-acc">{total.toLocaleString()}원</span>
                        </div>
                      </summary>
                      <div className="border-t border-bd">
                        {logs.map((l) => (
                          <div key={l.id} className="px-3 py-2 flex items-center justify-between gap-2 border-b border-bd last:border-none hover:bg-s3">
                            <div className="flex flex-wrap gap-2 items-center min-w-0">
                              <span className="bg-blu/10 text-blu text-[9px] font-bold px-1.5 py-0.5 rounded">{l.type}</span>
                              <span className="text-[11px] text-tx2">{l.date}</span>
                              {l.shop && <span className="text-[10px] text-tx3">{l.shop}</span>}
                              {l.note && <span className="text-[10px] text-tx3 truncate">{l.note}</span>}
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <span className="font-mono text-[11px] font-bold text-acc">{Number(l.cost).toLocaleString()}원</span>
                              <button onClick={() => removeLog(l.id)} className="text-tx3 hover:text-red transition-colors">
                                <Trash2 size={12} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </details>
                  );
                })}
              </div>
            </div>
          )}
          {form.maintLogs.length === 0 && (
            <div className="text-center py-5 text-tx3 text-[11px]">정비 이력이 없습니다</div>
          )}
        </div>
      )}
    </Modal>
  );
}
