"use client";

import { useRef, useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAppStore } from "@/lib/store";
import { applyTheme, applyFontSize } from "@/lib/theme";
import type { FontSize } from "@/lib/store";
import type { SafeUser } from "@/types";

export default function LoginPage() {
  const router = useRouter();
  const { setUser, showToast, setTheme } = useAppStore();
  const usernameRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const [error, setError]   = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    try {
      const t = (localStorage.getItem("exmgmt_theme") ?? "dark") as "dark" | "light";
      const f = (localStorage.getItem("exmgmt_font")  ?? "normal") as FontSize;
      applyTheme(t); setTheme(t);
      applyFontSize(f);
    } catch { /* ignore */ }
  }, [setTheme]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: usernameRef.current?.value ?? "",
          password: passwordRef.current?.value ?? "",
        }),
        credentials: "same-origin",
      });
      const json = await res.json();
      if (!json.ok) {
        setError(json.error);
        if (passwordRef.current) passwordRef.current.value = "";
        return;
      }
      setUser(json.data as SafeUser);
      showToast(`${json.data.name}님, 환영합니다!`);
      router.push("/dashboard/work");
    } catch {
      setError("네트워크 오류가 발생했습니다");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg p-4 pt-8 pb-safe"
      style={{backgroundImage:"radial-gradient(ellipse at 20% 50%,rgba(232,160,32,.06) 0%,transparent 60%),radial-gradient(ellipse at 80% 20%,rgba(74,142,245,.04) 0%,transparent 50%)"}}>
      <div className="bg-s1 border border-bd rounded-2xl shadow-deep p-6 sm:p-10 w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="text-4xl mb-3 animate-float inline-block">🚜</div>
          <div className="text-xl font-black uppercase tracking-widest text-acc">EX-MGMT Pro</div>
          <div className="text-[11px] text-tx3 mt-1 tracking-wider">중장비 통합 관리 시스템</div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-[10px] font-semibold text-tx3 uppercase tracking-wider mb-1">아이디</label>
            <input ref={usernameRef} type="text" autoComplete="username" required
              placeholder="아이디 입력"
              className="w-full bg-s2 border border-bd rounded text-tx text-sm px-3 py-3 outline-none transition-all placeholder:text-tx3 focus:border-acc focus:ring-2 focus:ring-acc/20 min-h-[48px]" />
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-tx3 uppercase tracking-wider mb-1">비밀번호</label>
            <input ref={passwordRef} type="password" autoComplete="current-password" required
              placeholder="비밀번호 입력"
              className="w-full bg-s2 border border-bd rounded text-tx text-sm px-3 py-3 outline-none transition-all placeholder:text-tx3 focus:border-acc focus:ring-2 focus:ring-acc/20 min-h-[48px]" />
          </div>

          {error && <p className="text-[11px] text-red text-center bg-red/10 border border-red/20 rounded p-2">{error}</p>}

          <button type="submit" disabled={loading}
            className="w-full bg-acc text-black font-bold text-sm py-3.5 rounded-lg mt-2 hover:bg-acc2 hover:shadow-acc transition-all disabled:opacity-60 disabled:cursor-not-allowed min-h-[52px] active:scale-95 touch-manipulation">
            {loading ? "로그인 중..." : "로그인"}
          </button>
        </form>

        <p className="text-center text-[11px] text-tx3 mt-5">
          계정이 없으신가요?{" "}
          <Link href="/register" className="text-acc hover:underline font-semibold">회원가입</Link>
        </p>
      </div>
    </div>
  );
}
