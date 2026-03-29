import { forwardRef } from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "ghost" | "danger" | "green" | "blue";
type Size    = "sm" | "md" | "lg";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  fullWidth?: boolean;
  loading?: boolean;
  as?: "button" | "a";
  href?: string;
  download?: boolean | string;
  target?: string;
}

const variantCls: Record<Variant, string> = {
  primary: "bg-acc text-black hover:bg-acc2 font-bold active:scale-95",
  ghost:   "bg-s2 text-tx2 border border-bd hover:bg-s3 hover:text-tx active:scale-95",
  danger:  "bg-red/10 text-red border border-red/20 hover:bg-red hover:text-white active:scale-95",
  green:   "bg-grn/10 text-grn border border-grn/25 hover:bg-grn hover:text-black active:scale-95",
  blue:    "bg-blu/10 text-blu border border-blu/25 hover:bg-blu hover:text-white active:scale-95",
};

const sizeCls: Record<Size, string> = {
  sm: "px-3 py-2 text-[11px] min-h-[36px]",
  md: "px-4 py-2.5 text-xs min-h-[44px]",
  lg: "px-5 py-3 text-sm min-h-[52px]",
};

const baseCls = "inline-flex items-center justify-center gap-1.5 rounded font-semibold transition-all duration-150 whitespace-nowrap cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed select-none touch-manipulation";

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "ghost", size = "md", fullWidth, loading, className, children, disabled, as: Tag, href, download, target, ...props }, ref) => {
    const cls = cn(baseCls, variantCls[variant], sizeCls[size], fullWidth && "w-full", className);
    const inner = (
      <>
        {loading && <span className="inline-block w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />}
        {children}
      </>
    );
    if (Tag === "a" || href) {
      return <a href={href} download={download} target={target} className={cls}>{inner}</a>;
    }
    return (
      <button ref={ref} disabled={disabled || loading} className={cls} {...props}>
        {inner}
      </button>
    );
  }
);
Button.displayName = "Button";
