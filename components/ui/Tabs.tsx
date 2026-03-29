"use client";

import { cn } from "@/lib/utils";

interface Tab {
  key: string;
  label: string;
}
interface TabsProps {
  tabs: Tab[];
  active: string;
  onChange: (key: string) => void;
}

export function Tabs({ tabs, active, onChange }: TabsProps) {
  return (
    <div className="flex bg-s2 rounded-sm p-0.5 mb-3.5">
      {tabs.map((t) => (
        <button
          key={t.key}
          onClick={() => onChange(t.key)}
          className={cn(
            "flex-1 py-1.5 text-[11px] font-semibold rounded-[4px] transition-all duration-150 cursor-pointer",
            active === t.key ? "bg-s4 text-tx" : "text-tx2 hover:text-tx"
          )}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}
