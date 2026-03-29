import { cn } from "@/lib/utils";

type BadgeVariant = "type" | "ok" | "warn" | "red" | "pur";

interface BadgeProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
  className?: string;
}

const variantCls: Record<BadgeVariant, string> = {
  type: "bg-blu/10 text-blu",
  ok:   "bg-grn/10 text-grn",
  warn: "bg-orn/15 text-orn",
  red:  "bg-red/10 text-red",
  pur:  "bg-pur/15 text-pur",
};

export function Badge({ variant = "type", children, className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider",
        variantCls[variant],
        className
      )}
    >
      {children}
    </span>
  );
}
