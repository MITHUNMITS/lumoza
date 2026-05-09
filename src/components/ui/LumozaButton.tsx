import type { ButtonHTMLAttributes, PropsWithChildren } from "react";

type LumozaButtonVariant = "primary" | "secondary" | "ghost" | "danger";

type LumozaButtonProps = PropsWithChildren<ButtonHTMLAttributes<HTMLButtonElement>> & {
  variant?: LumozaButtonVariant;
};

const variants: Record<LumozaButtonVariant, string> = {
  primary: "border-accent/40 bg-accent text-white shadow-glow hover:bg-accent/90",
  secondary: "border-white/10 bg-white/[0.065] text-text hover:border-accent/35 hover:bg-white/[0.095]",
  ghost: "border-transparent bg-transparent text-muted hover:bg-white/[0.06] hover:text-text",
  danger: "border-danger/35 bg-danger/10 text-danger hover:bg-danger/15",
};

export function LumozaButton({ children, className = "", variant = "secondary", ...props }: LumozaButtonProps) {
  return (
    <button
      {...props}
      className={`lumoza-focus inline-flex items-center justify-center gap-2 rounded-full border px-4 py-2.5 text-sm font-semibold transition duration-200 ease-lz disabled:opacity-45 ${variants[variant]} ${className}`}
    >
      {children}
    </button>
  );
}
