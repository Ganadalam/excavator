"use client";

import { useState, useEffect, useCallback } from "react";
import { useAppStore } from "@/lib/store";
import { useApi } from "@/hooks/useApi";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal, ConfirmModal } from "@/components/ui/Modal";

import type { AdminUserView } from "@/types";
import { Shield, ShieldOff, Trash2, KeyRound, UserCheck, UserX, RefreshCw, AlertTriangle } from "lucide-react";

export function AdminPanel() {
  const { user, showToast } = useAppStore();
  const { apiFetch }        = useApi();
  const router              = useRouter();

  const [users, setUsers]         = useState<AdminUserView[]>([]);
  const [loading, setLoading]     = useState(true);
  const [delTarget, setDelTarget] = useState<AdminUserView | null>(null);
  const [delLoading, setDelLoading] = useState(false);

  // Password reset modal
  const [pwTarget, setPwTarget]   = useState<AdminUserView | null>(null);
  const [newPw, setNewPw]         = useState("");
  const [pwLoading, setPwLoading] = useState(false);

  // Redirect non-admins
  useEffect(() => {
    if (user && user.role !== "admin") {
      showToast("관리자 권한이 필요합니다", "err");
      router.replace("/dashboard/work");
    }
  }, [user, router, showToast]);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    const res = await apiFetch<AdminUserView[]>("/api/admin/users");
    setLoading(false);
    if (res.ok) setUsers(res.data);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  async function toggleActive(u: AdminUserView) {
    const res = await apiFetch<AdminUserView>(`/api/admin/users/${u.id}`, {
      method: "PATCH",
      body: JSON.stringify({ isActive: !u.isActive }),
    });
    if (res.ok) {
      setUsers((prev) => prev.map((x) => x.id === u.id ? { ...x, isActive: !u.isActive } : x));
      showToast(u.isActive ? "계정이 비활성화되었습니다" : "계정이 활성화되었습니다");
    }
  }

  async function toggleRole(u: AdminUserView) {
    const newRole = u.role === "admin" ? "user" : "admin";
    const res = await apiFetch<AdminUserView>(`/api/admin/users/${u.id}`, {
      method: "PATCH",
      body: JSON.stringify({ role: newRole }),
    });
    if (res.ok) {
      setUsers((prev) => prev.map((x) => x.id === u.id ? { ...x, role: newRole } : x));
      showToast(newRole === "admin" ? "관리자 권한이 부여되었습니다" : "권한이 일반 사용자로 변경되었습니다");
    }
  }

  async function confirmDelete() {
    if (!delTarget) return;
    setDelLoading(true);
    const res = await apiFetch(`/api/admin/users/${delTarget.id}`, { method: "DELETE" });
    setDelLoading(false);
    if (res.ok) {
      setUsers((prev) => prev.filter((x) => x.id !== delTarget.id));
      showToast("회원이 삭제되었습니다");
      setDelTarget(null);
    }
  }

  async function submitPasswordReset() {
    if (!pwTarget || !newPw) return;
    if (newPw.length < 6) { showToast("비밀번호는 6자 이상이어야 합니다", "err"); return; }
    setPwLoading(true);
    const res = await apiFetch(`/api/admin/users/${pwTarget.id}`, {
      method: "PATCH",
      body: JSON.stringify({ password: newPw }),
    });
    setPwLoading(false);
    if (res.ok) {
      showToast("비밀번호가 변경되었습니다");
      setPwTarget(null);
      setNewPw("");
    }
  }

  if (user?.role !== "admin") return null;

  const totalWorks     = users.reduce((s, u) => s + u.worksCount, 0);
  const totalEquipments = users.reduce((s, u) => s + u.equipmentsCount, 0);
  const activeCount    = users.filter((u) => u.isActive).length;
  const adminCount     = users.filter((u) => u.role === "admin").length;

  return (
    <div className="animate-fade-in">
      {/* Page header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-base font-bold text-tx flex items-center gap-2">
            <Shield size={18} className="text-pur" /> 관리자 패널
          </h1>
          <p className="text-[11px] text-tx3 mt-0.5">회원 관리 및 권한 제어</p>
        </div>
        <Button variant="ghost" size="sm" onClick={fetchUsers}>
          <RefreshCw size={12} /> 새로고침
        </Button>
      </div>

      {/* Emergency access banner */}
      <div className="bg-orn/10 border border-orn/25 rounded-lg px-4 py-3 mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <AlertTriangle size={14} className="text-orn flex-shrink-0" />
          <div>
            <div className="text-[11px] font-semibold text-orn">비상 데이터 조회</div>
            <div className="text-[10px] text-tx3">DB 장애 시 /emergency 에서 최신 백업 데이터를 읽기 전용으로 조회할 수 있습니다.</div>
          </div>
        </div>
        <a href="/emergency" target="_blank"
          className="flex-shrink-0 text-[10px] px-3 py-1.5 bg-orn/15 border border-orn/30 text-orn rounded hover:bg-orn hover:text-black transition-colors font-semibold">
          열기 →
        </a>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-5">
        {[
          { label: "전체 회원",    value: `${users.length}명`,       color: "text-tx"  },
          { label: "활성 계정",    value: `${activeCount}명`,        color: "text-grn" },
          { label: "관리자",       value: `${adminCount}명`,         color: "text-pur" },
          { label: "총 작업 건수", value: `${totalWorks}건`,         color: "text-acc" },
        ].map((s) => (
          <div key={s.label} className="bg-s1 border border-bd rounded-lg px-4 py-3.5">
            <div className="text-[9px] text-tx3 uppercase tracking-wider mb-1.5">{s.label}</div>
            <div className={`font-mono text-base font-bold ${s.color}`}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* User table */}
      <div className="bg-s1 border border-bd rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b border-bd flex items-center justify-between">
          <span className="text-[10px] font-bold text-tx3 uppercase tracking-widest">회원 목록</span>
          <span className="text-[11px] text-tx3">{users.length}명</span>
        </div>

        {loading ? (
          <div className="py-16 text-center text-tx3 text-xs">불러오는 중...</div>
        ) : users.length === 0 ? (
          <div className="py-16 text-center text-tx3 text-xs">등록된 회원이 없습니다</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-bd bg-s2">
                  {["회원","아이디","역할","상태","작업","장비","업체","가입일","관리"].map((h) => (
                    <th key={h} className="text-left text-[9px] font-bold text-tx3 uppercase tracking-wider px-3 py-2.5">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {users.map((u) => {
                  const isSelf   = u.id === user.id;
                  const isActive = u.isActive !== false;
                  return (
                    <tr key={u.id} className={`border-b border-bd last:border-none transition-colors ${isActive ? "hover:bg-s2" : "opacity-50 hover:bg-s2"}`}>
                      {/* Name */}
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-acc/20 border border-acc/30 flex items-center justify-center text-[11px] font-black text-acc flex-shrink-0">
                            {u.name[0]?.toUpperCase()}
                          </div>
                          <div>
                            <div className="font-semibold text-tx">{u.name}</div>
                            {isSelf && <div className="text-[9px] text-acc">나</div>}
                          </div>
                        </div>
                      </td>
                      {/* Username */}
                      <td className="px-3 py-2.5 font-mono text-tx2">{u.username}</td>
                      {/* Role */}
                      <td className="px-3 py-2.5">
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded uppercase ${
                          u.role === "admin" ? "bg-pur/15 text-pur border border-pur/25" : "bg-s3 text-tx3 border border-bd"
                        }`}>
                          {u.role === "admin" ? "관리자" : "사용자"}
                        </span>
                      </td>
                      {/* Active */}
                      <td className="px-3 py-2.5">
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded ${
                          isActive ? "bg-grn/15 text-grn border border-grn/25" : "bg-red/10 text-red border border-red/20"
                        }`}>
                          {isActive ? "활성" : "비활성"}
                        </span>
                      </td>
                      {/* Stats */}
                      <td className="px-3 py-2.5 font-mono text-tx2">{u.worksCount}건</td>
                      <td className="px-3 py-2.5 font-mono text-tx2">{u.equipmentsCount}대</td>
                      <td className="px-3 py-2.5 font-mono text-tx2">{u.companiesCount}개</td>
                      {/* Created at */}
                      <td className="px-3 py-2.5 text-tx3">{u.createdAt.slice(0, 10)}</td>
                      {/* Actions */}
                      <td className="px-3 py-2.5">
                        <div className="flex gap-1 flex-wrap">
                          {/* Toggle active */}
                          <button
                            onClick={() => toggleActive(u)}
                            disabled={isSelf}
                            title={isActive ? "계정 비활성화" : "계정 활성화"}
                            className={`p-1.5 rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed ${
                              isActive
                                ? "text-grn hover:bg-grn/10"
                                : "text-red hover:bg-red/10"
                            }`}
                          >
                            {isActive ? <UserCheck size={13} /> : <UserX size={13} />}
                          </button>
                          {/* Toggle role */}
                          <button
                            onClick={() => toggleRole(u)}
                            disabled={isSelf}
                            title={u.role === "admin" ? "일반 사용자로 변경" : "관리자로 승격"}
                            className="p-1.5 rounded text-pur hover:bg-pur/10 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                          >
                            {u.role === "admin" ? <ShieldOff size={13} /> : <Shield size={13} />}
                          </button>
                          {/* Reset password */}
                          <button
                            onClick={() => { setPwTarget(u); setNewPw(""); }}
                            title="비밀번호 초기화"
                            className="p-1.5 rounded text-blu hover:bg-blu/10 transition-colors"
                          >
                            <KeyRound size={13} />
                          </button>
                          {/* Delete */}
                          <button
                            onClick={() => setDelTarget(u)}
                            disabled={isSelf}
                            title="회원 삭제"
                            className="p-1.5 rounded text-red hover:bg-red/10 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Password reset modal */}
      <Modal
        open={!!pwTarget}
        onClose={() => { setPwTarget(null); setNewPw(""); }}
        title={`비밀번호 초기화 — ${pwTarget?.name}`}
        size="sm"
        footer={<>
          <Button variant="ghost" onClick={() => { setPwTarget(null); setNewPw(""); }}>취소</Button>
          <Button variant="primary" onClick={submitPasswordReset} loading={pwLoading}>변경</Button>
        </>}
      >
        <p className="text-[11px] text-tx3 mb-3">
          <span className="font-bold text-tx">{pwTarget?.username}</span> 계정의 비밀번호를 새로 설정합니다.
        </p>
        <Input
          label="새 비밀번호"
          type="password"
          value={newPw}
          onChange={(e) => setNewPw(e.target.value)}
          placeholder="6자 이상"
          autoComplete="new-password"
        />
        <p className="text-[10px] text-tx3 mt-1">변경 후 해당 회원에게 직접 알려주세요.</p>
      </Modal>

      {/* Delete confirm */}
      <ConfirmModal
        open={!!delTarget}
        title="회원 삭제"
        description={`"${delTarget?.name}" (${delTarget?.username}) 회원을 삭제합니다. 작업 ${delTarget?.worksCount}건, 장비 ${delTarget?.equipmentsCount}대, 업체 ${delTarget?.companiesCount}개의 모든 데이터가 영구 삭제됩니다.`}
        onConfirm={confirmDelete}
        onClose={() => setDelTarget(null)}
        loading={delLoading}
      />
    </div>
  );
}
