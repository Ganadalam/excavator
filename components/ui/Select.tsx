import { cn } from "@/lib/utils";

interface SelectOption { value: string | number; label: string; }

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: SelectOption[];
  placeholder?: string;
  error?: string;
}

export function Select({ label, options, placeholder, error, className, id, ...props }: SelectProps) {
  return (
    <div className="mb-3">
      {label && (
        <label htmlFor={id} className="block text-[11px] font-semibold text-tx3 uppercase tracking-wider mb-1.5">
          {label}
        </label>
      )}
      <select
        id={id}
        className={cn(
          "w-full bg-s2 border border-bd rounded text-tx text-sm px-3 py-3",
          "outline-none transition-all duration-150",
          "focus:border-acc focus:ring-2 focus:ring-acc/20",
          "min-h-[48px] touch-manipulation appearance-none",
          "bg-no-repeat bg-right",
          error && "border-red focus:border-red focus:ring-red/20",
          className
        )}
        style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%237d8ba8' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")", backgroundPosition: "right 10px center" }}
        {...props}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      {error && <p className="text-[11px] text-red mt-1">{error}</p>}
    </div>
  );
}
