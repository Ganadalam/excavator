import { forwardRef } from "react";
import { cn } from "@/lib/utils";

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, className, id, ...props }, ref) => (
    <div className="mb-3">
      {label && (
        <label htmlFor={id} className="block text-[11px] font-semibold text-tx3 uppercase tracking-wider mb-1.5">
          {label}
        </label>
      )}
      <textarea
        ref={ref}
        id={id}
        rows={3}
        className={cn(
          "w-full bg-s2 border border-bd rounded text-tx text-sm px-3 py-3",
          "outline-none transition-all duration-150 placeholder:text-tx3 resize-y",
          "focus:border-acc focus:ring-2 focus:ring-acc/20",
          "min-h-[80px] touch-manipulation",
          error && "border-red focus:border-red focus:ring-red/20",
          className
        )}
        {...props}
      />
      {error && <p className="text-[11px] text-red mt-1">{error}</p>}
    </div>
  )
);
Textarea.displayName = "Textarea";
