"use client";

import { useEffect } from "react";
import { cn } from "@/lib/utils";
import { Button } from "./Button";
import { X } from "lucide-react";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  size?: "sm" | "md" | "lg" | "xl";
  children: React.ReactNode;
  footer?: React.ReactNode;
}

const sizeCls = {
  sm: "sm:w-80",
  md: "sm:w-96",
  lg: "sm:w-[640px]",
  xl: "sm:w-[780px]",
};

export function Modal({ open, onClose, title, size = "md", children, footer }: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    // Prevent body scroll when modal open
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", handler);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-black/75 backdrop-blur-[2px]"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className={cn(
        "bg-s1 border border-bd shadow-deep flex flex-col",
        "w-full max-w-full animate-slide-up",
        "rounded-t-2xl sm:rounded-xl",
        "max-h-[92vh] sm:max-h-[90vh]",
        sizeCls[size]
      )}>
        {/* Drag handle — mobile only */}
        <div className="sm:hidden flex justify-center pt-3 pb-1 flex-shrink-0">
          <div className="w-10 h-1 bg-bd2 rounded-full" />
        </div>

        {/* Header */}
        {title && (
          <div className="flex items-center justify-between px-5 py-4 border-b border-bd flex-shrink-0">
            <h2 className="font-bold text-base text-tx">{title}</h2>
            <button onClick={onClose} className="text-tx3 hover:text-tx transition-colors p-2 -mr-2 rounded-full">
              <X size={18} />
            </button>
          </div>
        )}

        {/* Body */}
        <div className="overflow-y-auto flex-1 px-5 py-4 overscroll-contain">{children}</div>

        {/* Footer */}
        {footer && (
          <div className="flex gap-2 justify-end px-5 py-4 border-t border-bd flex-shrink-0 safe-area-pb">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

interface ConfirmModalProps {
  open: boolean;
  title?: string;
  description: string;
  onConfirm: () => void;
  onClose: () => void;
  loading?: boolean;
}

export function ConfirmModal({ open, title = "삭제 확인", description, onConfirm, onClose, loading }: ConfirmModalProps) {
  return (
    <Modal open={open} onClose={onClose} title={title} size="sm"
      footer={<>
        <Button variant="ghost" onClick={onClose} disabled={loading}>취소</Button>
        <Button variant="danger" onClick={onConfirm} loading={loading}>삭제</Button>
      </>}>
      <p className="text-sm text-tx2 leading-relaxed">{description}</p>
    </Modal>
  );
}
