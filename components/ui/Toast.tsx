"use client";

import { useAppStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { CheckCircle, XCircle, Info, X } from "lucide-react";

const icons = {
  ok:   <CheckCircle size={16} className="text-grn flex-shrink-0" />,
  err:  <XCircle    size={16} className="text-red flex-shrink-0"  />,
  info: <Info       size={16} className="text-blu flex-shrink-0"  />,
};
const borderCls = { ok: "border-l-grn", err: "border-l-red", info: "border-l-blu" };

export function ToastContainer() {
  const { toasts, removeToast } = useAppStore();
  return (
    <div className="fixed bottom-4 left-3 right-3 sm:left-auto sm:right-5 sm:w-80 z-[9000] flex flex-col gap-2 pointer-events-none">
      {toasts.map((t) => (
        <div key={t.id}
          className={cn(
            "flex items-center gap-3 bg-s1 border border-bd border-l-[4px] rounded-lg",
            "px-4 py-3.5 text-sm shadow-deep pointer-events-auto animate-slide-up",
            borderCls[t.type]
          )}>
          {icons[t.type]}
          <span className="flex-1 text-tx leading-snug">{t.message}</span>
          <button onClick={() => removeToast(t.id)} className="text-tx3 hover:text-tx ml-1 p-1">
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}
