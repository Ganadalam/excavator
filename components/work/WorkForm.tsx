"use client";

import { useState, useMemo } from "react";
import { useAppStore } from "@/lib/store";
import { useApi } from "@/hooks/useApi";
import { calcWork, fmtKRW, fmtNum, today } from "@/lib/utils";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import type { Work } from "@/types";

const EMPTY = {
  date: today(), companyId: "", equipmentId: "",
  rate: "0", otr: "0", hours: "0", ohours: "0", fuel: "0", extra: "0", note: "",
};

export function WorkForm() {
  const { companies, equipments, addWork, updateWork, showToast } = useAppStore();
  const { apiFetch } = useApi();
  const [form, setForm]   = useState(EMPTY);
  const [loading, setLoading] = useState(false);
  const [editId, setEditId]   = useState<number | null>(null);

  const set = (k: keyof typeof EMPTY, v: string) => setForm((f) => ({ ...f, [k]: v }));

  function onEquipmentChange(id: string) {
    set("equipmentId", id);
    const eq = equipments.find((e) => String(e.id) === id);
    if (eq) {
      set("rate", String(eq.rate ?? ""));
      set("otr",  String(Math.round((eq.rate ?? 0) * 1.5)));
      set("fuel", String(eq.baseFuel ?? ""));
    }
  }

  function loadForEdit(w: Work) {
    setEditId(w.id);
    setForm({
      date: w.date, companyId: String(w.companyId), equipmentId: String(w.equipmentId),
      rate: String(w.rate), otr: String(w.otr), hours: String(w.hours),
      ohours: String(w.ohours), fuel: String(w.fuel), extra: String(w.extra), note: w.note,
    });
  }

  // Expose to WorkList via window ref
  if (typeof window !== "undefined") {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).__workFormEdit = loadForEdit;
  }

  function resetForm() { setEditId(null); setForm({ ...EMPTY, date: today() }); }

  const preview = useMemo(() => {
    const h = Number(form.hours) || 0, oh = Number(form.ohours) || 0;
    const r = Number(form.rate) || 0, otr = Number(form.otr) || r * 1.5;
    const fuel = Number(form.fuel) || 0, ex = Number(form.extra) || 0;
    return { base: h * r, over: oh * otr, fuel, extra: ex, total: h * r + oh * otr + fuel + ex };
  }, [form]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.date)        return showToast("작업일을 입력하세요", "err");
    if (!form.companyId)   return showToast("업체를 선택하세요", "err");
    if (!form.equipmentId) return showToast("장비를 선택하세요", "err");
    if (!Number(form.hours) && !Number(form.ohours)) return showToast("작업 시간을 입력하세요", "err");

    setLoading(true);
    const payload = {
      date: form.date, companyId: Number(form.companyId), equipmentId: Number(form.equipmentId),
      rate: Number(form.rate) || 0, otr: Number(form.otr) || Number(form.rate) * 1.5,
      hours: Number(form.hours) || 0, ohours: Number(form.ohours) || 0,
      fuel: Number(form.fuel) || 0, extra: Number(form.extra) || 0, note: form.note,
    };

    if (editId) {
      const res = await apiFetch<Work>(`/api/works/${editId}`, { method: "PUT", body: JSON.stringify({ ...payload, id: editId }) });
      setLoading(false);
      if (!res.ok) return;
      updateWork(res.data);
      showToast("작업이 수정되었습니다");
    } else {
      const res = await apiFetch<Work>("/api/works", { method: "POST", body: JSON.stringify(payload) });
      setLoading(false);
      if (!res.ok) return;
      addWork(res.data);
      showToast("작업이 저장되었습니다");
    }
    resetForm();
  }

  const companyOpts   = companies.map((c) => ({ value: c.id, label: c.name }));
  const equipmentOpts = equipments.map((e) => ({ value: e.id, label: `${e.name} (${e.type})` }));

  return (
    <form onSubmit={handleSubmit} className="bg-s1 border border-bd rounded-lg p-4">
      <div className="flex items-center justify-between mb-3.5">
        <div className="text-[10px] font-bold tracking-widest uppercase text-tx3">
          {editId ? "✏ 작업 수정" : "✚ 작업 등록"}
        </div>
        {editId && (
          <button type="button" onClick={resetForm} className="text-[10px] text-tx3 hover:text-tx underline">취소</button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Input label="작업일" required type="date" value={form.date} onChange={(e) => set("date", e.target.value)} />
        <Select label="업체" required options={companyOpts} placeholder="선택" value={form.companyId}
          onChange={(e) => set("companyId", e.target.value)} />
      </div>
      <Select label="장비" required options={equipmentOpts} placeholder="선택" value={form.equipmentId}
        onChange={(e) => onEquipmentChange(e.target.value)} />
      <div className="grid grid-cols-2 gap-2">
        <Input label="기본단가 (원/h)" type="number" min="0" value={form.rate}
          onChange={(e) => set("rate", e.target.value)} placeholder="0" />
        <Input label="초과단가 (원/h)" type="number" min="0" value={form.otr}
          onChange={(e) => set("otr", e.target.value)} placeholder="자동 ×1.5" />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Input label="기본시간 (h)" type="number" min="0" step="0.5" value={form.hours}
          onChange={(e) => set("hours", e.target.value)} placeholder="0" />
        <Input label="초과시간 (h)" type="number" min="0" step="0.5" value={form.ohours}
          onChange={(e) => set("ohours", e.target.value)} placeholder="0" />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Input label="유류비 (원)" type="number" min="0" value={form.fuel}
          onChange={(e) => set("fuel", e.target.value)} placeholder="0" />
        <Input label="추가비용 (원)" type="number" min="0" value={form.extra}
          onChange={(e) => set("extra", e.target.value)} placeholder="0" />
      </div>
      <Input label="메모" value={form.note} onChange={(e) => set("note", e.target.value)} placeholder="야간작업, 우천중단..." />

      {/* Cost preview */}
      <div className="bg-s3 border border-bd rounded-sm p-3 mt-1 mb-2">
        <div className="text-[9px] text-tx3 uppercase tracking-wider mb-2">예상 청구금액</div>
        <div className="font-mono text-xl font-bold text-acc mb-2">{fmtKRW(preview.total)}</div>
        <div className="space-y-0.5">
          {preview.base  > 0 && (
            <div className="flex justify-between font-mono text-[10px] text-tx3">
              <span>기본 ({form.hours}h × {fmtNum(form.rate)}원)</span>
              <span className="text-tx2">{fmtNum(preview.base)}원</span>
            </div>
          )}
          {preview.over  > 0 && (
            <div className="flex justify-between font-mono text-[10px] text-tx3">
              <span>초과 ({form.ohours}h × {fmtNum(form.otr || String(Number(form.rate) * 1.5))}원)</span>
              <span className="text-tx2">{fmtNum(preview.over)}원</span>
            </div>
          )}
          {preview.fuel  > 0 && <div className="flex justify-between font-mono text-[10px] text-tx3"><span>유류비</span><span className="text-tx2">{fmtNum(preview.fuel)}원</span></div>}
          {preview.extra > 0 && <div className="flex justify-between font-mono text-[10px] text-tx3"><span>추가</span><span className="text-tx2">{fmtNum(preview.extra)}원</span></div>}
          {preview.total === 0 && <div className="text-[10px] text-tx3">장비·시간을 입력하면 자동 계산됩니다</div>}
        </div>
      </div>

      <Button variant="primary" fullWidth type="submit" loading={loading}>
        {editId ? "💾 수정 저장" : "💾 작업 저장"}
      </Button>
    </form>
  );
}
