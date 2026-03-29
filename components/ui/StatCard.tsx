import { cn } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: string | number;
  color?: "default" | "acc" | "grn" | "red" | "blu";
  sub?: string;
}

const colorCls = {
  default: "text-tx",
  acc:     "text-acc",
  grn:     "text-grn",
  red:     "text-red",
  blu:     "text-blu",
};

export function StatCard({ label, value, color = "default", sub }: StatCardProps) {
  return (
    <div className="bg-s1 border border-bd rounded-lg px-3 sm:px-4 py-3 sm:py-3.5">
      <div className="text-[10px] text-tx3 uppercase tracking-wider mb-1.5 leading-tight">{label}</div>
      <div className={cn("font-mono text-base sm:text-lg font-bold leading-tight", colorCls[color])}>{value}</div>
      {sub && <div className="text-[10px] text-tx3 mt-1">{sub}</div>}
    </div>
  );
}
