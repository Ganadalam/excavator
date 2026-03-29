"use client";

import { forwardRef, useCallback } from "react";
import { cn } from "@/lib/utils";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  required?: boolean;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, required, error, className, id, onFocus, onBlur, type, ...props }, ref) => {

    const handleFocus = useCallback((e: React.FocusEvent<HTMLInputElement>) => {
      if (type === "number" && e.target.value === "0") e.target.value = "";
      onFocus?.(e);
    }, [type, onFocus]);

    const handleBlur = useCallback((e: React.FocusEvent<HTMLInputElement>) => {
      onBlur?.(e);
    }, [onBlur]);

    return (
      <div className="mb-3">
        {label && (
          <label htmlFor={id} className="block text-[11px] font-semibold text-tx3 uppercase tracking-wider mb-1.5">
            {label} {required && <span className="text-red">*</span>}
          </label>
        )}
        <input
          ref={ref}
          id={id}
          type={type}
          onFocus={handleFocus}
          onBlur={handleBlur}
          className={cn(
            "w-full bg-s2 border border-bd rounded text-tx text-sm px-3 py-3",
            "outline-none transition-all duration-150 placeholder:text-tx3",
            "focus:border-acc focus:ring-2 focus:ring-acc/20",
            "min-h-[48px] touch-manipulation",
            error && "border-red focus:border-red focus:ring-red/20",
            className
          )}
          {...props}
        />
        {error && <p className="text-[11px] text-red mt-1">{error}</p>}
      </div>
    );
  }
);
Input.displayName = "Input";
