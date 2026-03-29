"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAppStore } from "@/lib/store";
import { useInitData } from "@/hooks/useData";
import { Header } from "@/components/layout/Header";
import { ToastContainer } from "@/components/ui/Toast";
import { applyTheme, applyFontSize } from "@/lib/theme";
import type { SafeUser } from "@/types";
import type { FontSize } from "@/lib/store";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, setUser, setTheme, setFontSize } = useAppStore();

  useEffect(() => {
    try {
      const t = (localStorage.getItem("exmgmt_theme") ?? "dark") as "dark" | "light";
      const f = (localStorage.getItem("exmgmt_font")  ?? "normal") as FontSize;
      applyTheme(t); setTheme(t);
      applyFontSize(f); setFontSize(f);
    } catch { /* ignore */ }

    (async () => {
      const res  = await fetch("/api/auth/me", { credentials: "same-origin" });
      const json = await res.json();
      if (!json.ok) { router.replace("/login"); return; }
      setUser(json.data as SafeUser);
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useInitData();

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg">
        <div className="flex flex-col items-center gap-3 text-tx3">
          <div className="text-3xl animate-float">🚜</div>
          <div className="text-sm">불러오는 중...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-bg">
      <Header />
      <main className="flex-1 p-3 sm:p-5 max-w-[1280px] w-full mx-auto animate-fade-in pb-6">
        {children}
      </main>
      <ToastContainer />
    </div>
  );
}
