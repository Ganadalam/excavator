"use client";

import { useState } from "react";
import { useAppStore } from "@/lib/store";
import { useApi } from "@/hooks/useApi";
import { calcWork, fmtKRW } from "@/lib/utils";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Button } from "@/components/ui/Button";
import { ConfirmModal } from "@/components/ui/Modal";
import type { Company } from "@/types";

const EMPTY = { name:"", manager:"", contact:"", bizNo:"", contractStart:"", address:"", mainContract:"", note:"" };

export function CompanyPanel() {
  const { companies, works, addCompany, updateCompany, removeCompany, showToast } = useAppStore();
  const { apiFetch } = useApi();
  const [form, setForm]         = useState(EMPTY);
  const [editId, setEditId]     = useState<number | null>(null);
  const [loading, setLoading]   = useState(false);
  const [delTarget, setDelTarget] = useState<Company | null>(null);
  const [delLoading, setDelLoading] = useState(false);

  const set = (k: keyof typeof EMPTY, v: string) => setForm((f) => ({ ...f, [k]: v }));

  function startEdit(c: Company) {
    setEditId(c.id);
    setForm({
      name: c.name, manager: c.manager, contact: c.contact,
      bizNo: c.bizNo, contractStart: c.contractStart,
      address: c.address, mainContract: c.mainContract, note: c.note,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function cancelEdit() {
    setEditId(null);
    setForm(EMPTY);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name) return showToast("업체명을 입력하세요","err");
    setLoading(true);

    if (editId !== null) {
      // Update
      const res = await apiFetch<Company>(`/api/companies/${editId}`, {
        method: "PUT", body: JSON.stringify({ ...form, id: editId }),
      });
      setLoading(false);
      if (!res.ok) return;
      updateCompany(res.data);
      showToast("업체 정보가 수정되었습니다");
      cancelEdit();
    } else {
      // Create
      const res = await apiFetch<Company>("/api/companies", { method:"POST", body: JSON.stringify(form) });
      setLoading(false);
      if (!res.ok) return;
      addCompany(res.data);
      showToast("업체가 등록되었습니다");
      setForm(EMPTY);
    }
  }

  async function confirmDelete() {
    if (!delTarget) return;
    setDelLoading(true);
    const res = await apiFetch(`/api/companies/${delTarget.id}`, { method:"DELETE" });
    setDelLoading(false);
    if (!res.ok) return;
    removeCompany(delTarget.id);
    showToast("삭제되었습니다");
    setDelTarget(null);
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-4 items-start">
      {/* List */}
      <div>
        <div className="text-[11px] text-tx3 mb-3">총 {companies.length}개 업체</div>
        {companies.length === 0 ? (
          <div className="text-center py-10 text-tx3 text-xs">
            <div className="text-3xl mb-2 opacity-30">🏢</div>등록된 업체가 없습니다
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {companies.map((c) => {
              const cw = works.filter((w) => w.companyId === c.id);
              const cr = cw.reduce((s, w) => s + calcWork(w), 0);
              return (
                <div key={c.id} className="bg-s2 border border-bd rounded-lg p-3 hover:border-bd2 transition-colors">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="font-bold text-[13px]">🏢 {c.name}</div>
                    <div className="flex gap-1.5">
                      <Button size="sm" variant="ghost" onClick={() => startEdit(c)}>수정</Button>
                      <Button size="sm" variant="danger" onClick={() => setDelTarget(c)}>삭제</Button>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 mb-2">
                    {c.manager      && <span className="text-[11px] text-tx2">👤 {c.manager}</span>}
                    {c.contact      && <span className="text-[11px] text-tx2">📞 {c.contact}</span>}
                    {c.bizNo        && <span className="text-[11px] text-tx2">🏭 {c.bizNo}</span>}
                    {c.address      && <span className="text-[11px] text-tx2">📍 {c.address}</span>}
                    {c.contractStart && <span className="text-[11px] text-tx2">📅 {c.contractStart}</span>}
                    {c.mainContract && <span className="text-[11px] text-tx2">📋 {c.mainContract}</span>}
                  </div>
                  {c.note && <div className="text-[11px] text-tx3 mb-2">{c.note}</div>}
                  <div className="flex gap-4 text-[11px] text-tx2">
                    <span>작업 {cw.length}건</span>
                    {cr > 0 && <span className="font-mono text-acc font-semibold">{fmtKRW(cr)}</span>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Form — right side */}
      <form onSubmit={handleSubmit} className="bg-s1 border border-bd rounded-lg p-4 sticky top-[70px]">
        <div className="text-[10px] font-bold tracking-widest uppercase text-tx3 mb-3.5">
          {editId !== null ? "✏ 업체 수정" : "✚ 업체 등록"}
        </div>
        <Input label="업체명" required value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="A건설" />
        <div className="grid grid-cols-2 gap-2">
          <Input label="담당자" value={form.manager} onChange={(e) => set("manager", e.target.value)} placeholder="박과장" />
          <Input label="연락처" value={form.contact} onChange={(e) => set("contact", e.target.value)} placeholder="010-0000-0000" />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Input label="사업자번호" value={form.bizNo} onChange={(e) => set("bizNo", e.target.value)} placeholder="000-00-00000" />
          <Input label="계약시작일" type="date" value={form.contractStart} onChange={(e) => set("contractStart", e.target.value)} />
        </div>
        <Input label="주소" value={form.address} onChange={(e) => set("address", e.target.value)} placeholder="현장 주소" />
        <Input label="주 계약 건" value={form.mainContract} onChange={(e) => set("mainContract", e.target.value)} placeholder="토목공사" />
        <Textarea label="메모" value={form.note} onChange={(e) => set("note", e.target.value)} placeholder="특이사항" />
        <div className="flex gap-2">
          {editId !== null && (
            <Button type="button" variant="ghost" fullWidth onClick={cancelEdit}>취소</Button>
          )}
          <Button variant="primary" fullWidth type="submit" loading={loading}>
            {editId !== null ? "저장" : "등록"}
          </Button>
        </div>
      </form>

      <ConfirmModal
        open={!!delTarget}
        description={`"${delTarget?.name}" 업체를 삭제하시겠습니까? 작업 기록이 있으면 삭제할 수 없습니다.`}
        onConfirm={confirmDelete}
        onClose={() => setDelTarget(null)}
        loading={delLoading}
      />
    </div>
  );
}
