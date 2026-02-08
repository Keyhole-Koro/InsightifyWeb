import { ButtonHTMLAttributes, CSSProperties } from "react";

type Variant = "primary" | "success" | "secondary";

const variantColors: Record<Variant, { bg: string; bgDisabled: string }> = {
  primary: { bg: "#2563eb", bgDisabled: "#94a3b8" },
  success: { bg: "#10b981", bgDisabled: "#94a3b8" },
  secondary: { bg: "#6b7280", bgDisabled: "#94a3b8" },
};

interface ActionButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
}

export const ActionButton = ({
  variant = "primary",
  disabled,
  style,
  children,
  ...props
}: ActionButtonProps) => {
  const colors = variantColors[variant];

  const buttonStyle: CSSProperties = {
    padding: "8px 16px",
    fontSize: "14px",
    fontWeight: 600,
    fontFamily: 'var(--font-ui, "Manrope", "Segoe UI", sans-serif)',
    letterSpacing: "0.01em",
    color: "#ffffff",
    backgroundColor: disabled ? colors.bgDisabled : colors.bg,
    border: "none",
    borderRadius: "6px",
    cursor: disabled ? "not-allowed" : "pointer",
    transition: "background-color 0.2s",
    boxShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
    ...style,
  };

  return (
    <button type="button" disabled={disabled} style={buttonStyle} {...props}>
      {children}
    </button>
  );
};
