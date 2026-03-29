"use client";

import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { useAppStore } from "@/lib/store";
import { useApi } from "@/hooks/useApi";
import { fmtKRW, calcWork } from "@/lib/utils";
import { LogOut, Truck, Sun, Moon, Shield, ALargeSmall } from "lucide-react";
import { useMemo, useEffect, useState } from "react";
import { applyTheme, applyFontSize } from "@/lib/theme";
import type { FontSize } from "@/lib/store";

const NAV_ITEMS = [
  { href: "/dashboard/work",      label: "작업" },
  { href: "/dashboard/equipment", label: "장비" },
  { href: "/dashboard/company",   label: "업체" },
  { href: "/dashboard/report",    label: "보고서" },
];

const FONT_LABELS: Record<FontSize, string> = {
  normal: "보통",
  large:  "크게",
  xlarge: "최대",
};

export function Header() {
  const router   = useRouter();
  const pathname = usePathname();
  const { user, works, theme, setTheme, fontSize, setFontSize } = useAppStore();
  const { apiFetch } = useApi();
  const [fontMenuOpen, setFontMenuOpen] = useState(false);

  useEffect(() => {
    try {
      const savedTheme = (localStorage.getItem("exmgmt_theme") ?? "dark") as "dark" | "light";
      const savedFont  = (localStorage.getItem("exmgmt_font")  ?? "normal") as FontSize;
      setTheme(savedTheme);
      setFontSize(savedFont);
    } catch { /* ignore */ }
  }, [setTheme, setFontSize]);

  const monthTotal = useMemo(() => {
    const now = new Date();
    return works
      .filter((w) => {
        const d = new Date(w.date + "T00:00:00");
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      })
      .reduce((s, w) => s + calcWork(w), 0);
  }, [works]);

  async function handleLogout() {
    await apiFetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  function handleThemeToggle() {
    const next = theme === "dark" ? "light" : "dark";
    applyTheme(next);
    setTheme(next);
  }

  function handleFontSize(size: FontSize) {
    applyFontSize(size);
    setFontSize(size);
    setFontMenuOpen(false);
  }

  const navItems = [
    ...NAV_ITEMS,
    ...(user?.role === "admin" ? [{ href: "/dashboard/admin", label: "관리자" }] : []),
  ];

  return (
    <header className="sticky top-0 z-50 bg-s1 border-b border-bd">
      {/* Main header row */}
      <div className="flex items-center gap-2 px-3 sm:px-5 h-[54px]">
        {/* Logo */}
        <Link href="/dashboard/work"
          className="flex items-center gap-1.5 text-acc font-black text-[13px] uppercase tracking-widest hover:opacity-80 transition-opacity flex-shrink-0">
          <Truck size={16} />
          <span className="hidden sm:inline">EX-MGMT</span>
          <span className="sm:hidden">EX</span>
        </Link>

        {/* Month total — mobile visible */}
        <div className="text-right flex-1 sm:flex-none">
          <div className="font-mono text-xs font-bold text-acc leading-tight">{fmtKRW(monthTotal)}</div>
          <div className="text-[9px] text-tx3 leading-tight hidden sm:block">이번달</div>
        </div>

        <div className="flex-1 hidden sm:block" />

        {/* Right controls */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {/* Font size button */}
          <div className="relative">
            <button
              onClick={() => setFontMenuOpen((v) => !v)}
              className="flex items-center gap-1 w-8 h-8 sm:w-auto sm:px-2.5 justify-center rounded-full sm:rounded bg-s2 border border-bd hover:border-bd2 transition-colors text-tx2 hover:text-tx"
              title="글자 크기"
            >
              <ALargeSmall size={14} />
              <span className="hidden sm:inline text-[10px]">{FONT_LABELS[fontSize]}</span>
            </button>
            {fontMenuOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setFontMenuOpen(false)} />
                <div className="absolute right-0 top-full mt-1 z-50 bg-s1 border border-bd rounded-lg shadow-deep overflow-hidden min-w-[110px]">
                  {(["normal", "large", "xlarge"] as FontSize[]).map((size) => (
                    <button key={size} onClick={() => handleFontSize(size)}
                      className={`w-full px-3 py-2.5 text-left text-xs flex items-center justify-between hover:bg-s2 transition-colors ${fontSize === size ? "text-acc font-bold" : "text-tx2"}`}>
                      <span>{FONT_LABELS[size]}</span>
                      {fontSize === size && <span className="text-acc text-[10px]">✓</span>}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Theme toggle */}
          <button onClick={handleThemeToggle}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-s2 border border-bd hover:border-bd2 transition-colors text-tx2 hover:text-tx"
            title={theme === "dark" ? "라이트 모드" : "다크 모드"}>
            {theme === "dark" ? <Sun size={14} /> : <Moon size={14} />}
          </button>

          {/* User / logout */}
          <button onClick={handleLogout}
            className="flex items-center gap-1.5 bg-s2 border border-bd rounded-full px-2.5 py-1.5 text-[11px] font-semibold hover:border-bd2 transition-colors group">
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-black flex-shrink-0 ${user?.role === "admin" ? "bg-pur text-white" : "bg-acc text-black"}`}>
              {user?.name?.[0]?.toUpperCase() ?? "?"}
            </div>
            <span className="text-tx hidden sm:inline max-w-[80px] truncate">{user?.name ?? "-"}</span>
            {user?.role === "admin" && <Shield size={9} className="text-pur hidden sm:inline" />}
            <LogOut size={11} className="text-tx3 group-hover:text-red transition-colors" />
          </button>
        </div>
      </div>

      {/* Bottom nav bar — always visible */}
      <nav className="flex border-t border-bd overflow-x-auto">
        {navItems.map((item) => {
          const active  = pathname.startsWith(item.href);
          const isAdmin = item.href === "/dashboard/admin";
          return (
            <Link key={item.href} href={item.href}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium transition-all whitespace-nowrap min-w-[60px] border-b-2 ${
                active
                  ? isAdmin
                    ? "border-pur text-pur bg-pur/5"
                    : "border-acc text-acc bg-acc/5"
                  : "border-transparent text-tx2 hover:text-tx hover:bg-s2"
              }`}>
              {isAdmin && <Shield size={11} />}
              {item.label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
